import { expect, test } from '@playwright/test'

interface Snapshot {
  statuses: (string | null)[]
  contexts: number
}

test('below-fold scenes stay idle and create no WebGL context until scrolled to', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const holder = window as unknown as { contexts: number }
    holder.contexts = 0
    const proto = HTMLCanvasElement.prototype
    const original = Reflect.get(proto, 'getContext') as (...args: unknown[]) => unknown
    Reflect.set(
      proto,
      'getContext',
      function (this: HTMLCanvasElement, ...args: unknown[]) {
        if (args[0] === 'webgl2') holder.contexts += 1
        return Reflect.apply(original, this, args)
      },
    )
  })
  const snapshot = (): Promise<Snapshot> =>
    page.evaluate(() => ({
      statuses: Array.from(document.querySelectorAll('[data-scene-status]')).map((n) =>
        n.getAttribute('data-scene-status'),
      ),
      contexts: (window as unknown as { contexts: number }).contexts,
    }))

  await page.goto('/', { waitUntil: 'load' })
  await expect(page.locator('[data-scene-status]')).toHaveCount(3)
  await expect(page.locator('[data-scene-status="active"]')).toHaveCount(1, {
    timeout: 15_000,
  })
  await page.waitForTimeout(1000)
  const atLoad = await snapshot()
  console.log(
    `LAZY at-load ${atLoad.statuses.join(',')} contexts=${String(atLoad.contexts)}`,
  )
  expect(atLoad.statuses).toEqual(['active', 'idle', 'idle'])
  expect(atLoad.contexts).toBe(2)

  for (let i = 0; i < 10; i += 1) {
    await page.mouse.wheel(0, 700)
    await page.waitForTimeout(400)
  }
  await expect(page.locator('[data-scene-status="active"]')).toHaveCount(3, {
    timeout: 15_000,
  })
  const afterScroll = await snapshot()
  console.log(
    `LAZY after-scroll ${afterScroll.statuses.join(',')} contexts=${String(afterScroll.contexts)}`,
  )
  expect(afterScroll.contexts).toBe(4)
})
