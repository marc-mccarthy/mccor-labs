import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Route } from '@playwright/test'

import { contactLabCopy } from '@/content/lab/copy'
import { EMPTY_ANSWERS, QUESTION_KEYS, classifyStep } from '@/content/lab/rubric'
import { nav } from '@/content/nav'
import { ui } from '@/content/ui'
import { encodeLabResult, toLabResult } from '@/lib/labResult'

import { builtWithEndpoint } from './support'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const REFERENCE = 'MC-7Q4K'

type Responder = (route: Route) => Promise<void>

interface Mock {
  requests: string[]
  fulfilled: number
  responder: Responder
  release: () => void
}

let mock: Mock

function reply(status: number, body: Record<string, unknown>): Responder {
  return async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  }
}

function gated(): { responder: Responder; release: () => void } {
  let release: () => void = () => undefined
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  return {
    responder: async (route) => {
      await gate
      await reply(200, { reference: REFERENCE })(route)
    },
    release,
  }
}

async function tokenColor(page: Page, name: string) {
  return page.evaluate((token) => {
    const probe = document.createElement('div')
    probe.style.color = `var(${token})`
    document.body.append(probe)
    const color = getComputedStyle(probe).color
    probe.remove()
    return color
  }, name)
}

async function noOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }))
  expect(widths.scroll).toBe(widths.client)
}

function labHash(): string {
  const answers = {
    ...EMPTY_ANSWERS,
    ...Object.fromEntries(QUESTION_KEYS.map((key) => [key, 'yes'])),
  }
  const result = toLabResult(
    [{ name: 'Send invoices', answers, result: classifyStep(answers) }],
    true,
  )
  return `#lab=${encodeLabResult(result)}`
}

async function open(page: Page, hash = '') {
  await page.goto(`/contact/${hash}`, { waitUntil: 'networkidle' })
  await page.waitForFunction(
    () =>
      document.querySelector('[data-reveal="pending"]') === null &&
      [...document.querySelectorAll('[data-reveal]')]
        .filter((element) => element.getBoundingClientRect().top < window.innerHeight)
        .every((element) => getComputedStyle(element).opacity === '1'),
  )
}

async function fillValid(page: Page) {
  await page.locator('#name').fill('Ada Lovelace')
  await page.locator('#email').fill('ada@example.com')
  await page.locator('#message').fill('A message long enough to pass validation.')
}

async function submit(page: Page) {
  await page.getByRole('button', { name: ui.formSubmit }).click()
}

async function submitWith(page: Page, responder: Responder) {
  mock.responder = responder
  await fillValid(page)
  await submit(page)
}

async function expectStatus(page: Page, text: string) {
  await expect(page.getByRole('status')).toHaveText(text)
}

interface State {
  name: string
  hash?: string
  drive: (page: Page) => Promise<void>
}

const STATES: State[] = [
  { name: 'idle', drive: () => Promise.resolve() },
  {
    name: 'empty validation',
    drive: async (page) => {
      await submit(page)
      await expect(page.locator('#name-error')).toBeVisible()
      await expect(page.locator('#email-error')).toBeVisible()
      await expect(page.locator('#message-error')).toBeVisible()
    },
  },
  {
    name: 'focus-invalid',
    drive: async (page) => {
      await page.locator('#name').fill('Ada Lovelace')
      await page.locator('#message').fill('A message long enough to pass validation.')
      await submit(page)
      await expect(page.locator('#email-error')).toBeVisible()
      await expect(page.locator('#email')).toBeFocused()
    },
  },
  {
    name: 'sending',
    drive: async (page) => {
      const pending = gated()
      mock.release = pending.release
      await submitWith(page, pending.responder)
      await expect(page.getByRole('button', { name: ui.formSending })).toBeVisible()
    },
  },
  {
    name: 'success with reference',
    drive: async (page) => {
      await submitWith(page, reply(200, { reference: REFERENCE }))
      await expectStatus(page, `${ui.formSuccess} ${ui.formReference} ${REFERENCE}.`)
    },
  },
  {
    name: 'success without reference',
    drive: async (page) => {
      await submitWith(page, reply(200, {}))
      await expectStatus(page, ui.formSuccess)
    },
  },
  {
    name: 'daily_cap',
    drive: async (page) => {
      await submitWith(page, reply(429, { reason: 'daily_cap' }))
      await expect(page.getByRole('status')).toContainText(
        ui.formErrorDailyCap.slice(0, 20),
      )
    },
  },
  {
    name: 'rate_limit',
    drive: async (page) => {
      await submitWith(page, reply(429, {}))
      await expectStatus(page, ui.formErrorRateLimit)
    },
  },
  {
    name: 'too_fast',
    drive: async (page) => {
      await submitWith(page, reply(400, { reason: 'too_fast' }))
      await expectStatus(page, ui.formErrorTooFast)
    },
  },
  {
    name: 'validation',
    drive: async (page) => {
      await submitWith(page, reply(400, {}))
      await expectStatus(page, ui.formErrorValidation)
    },
  },
  {
    name: 'server',
    drive: async (page) => {
      await submitWith(page, reply(500, {}))
      await expect(page.getByRole('status')).toContainText(
        ui.formErrorServer.slice(0, 20),
      )
    },
  },
  {
    name: 'lab prefill',
    hash: labHash(),
    drive: async (page) => {
      await expect(page.getByText(contactLabCopy.added)).toBeVisible()
      await expect(page.locator('#message')).not.toHaveValue('')
    },
  },
]

async function settleReveals(page: Page) {
  await page.evaluate(() => {
    for (const element of document.querySelectorAll('[data-reveal]')) {
      element.scrollIntoView({ block: 'center' })
    }
  })
  await page.waitForFunction(() =>
    [...document.querySelectorAll('[data-reveal]')].every(
      (element) => getComputedStyle(element).opacity === '1',
    ),
  )
}

async function expectNoViolations(page: Page) {
  await settleReveals(page)
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  await noOverflow(page)
}

test.beforeEach(async ({ page }) => {
  mock = {
    requests: [],
    fulfilled: 0,
    responder: reply(500, {}),
    release: () => undefined,
  }
  const current = mock
  page.on('request', (request) => {
    if (request.url().includes('/api/contact')) current.requests.push(request.url())
  })
  await page.route('**/api/contact', async (route) => {
    await current.responder(route)
    current.fulfilled += 1
  })
})

test.afterEach(async () => {
  mock.release()
  await expect.poll(() => mock.fulfilled).toBe(mock.requests.length)
})

function axeMatrix(width: number) {
  for (const motion of ['reduce', 'no-preference'] as const) {
    test.describe(motion, () => {
      test.use({ contextOptions: { reducedMotion: motion } })
      for (const state of STATES) {
        test(`contact state ${state.name} passes axe at ${String(width)} ${motion}`, async ({
          page,
        }) => {
          await open(page, state.hash)
          await state.drive(page)
          await expectNoViolations(page)
        })
      }
    })
  }
}

test.describe('live form', () => {
  test.skip(!builtWithEndpoint(), 'needs a build with the contact endpoint')

  test.describe('at 1440', () => {
    test.use({ viewport: { width: 1440, height: 900 } })
    axeMatrix(1440)
  })

  test.describe('at 390', () => {
    test.use({ viewport: { width: 390, height: 844 } })
    axeMatrix(390)

    test.describe('with motion', () => {
      test.use({ contextOptions: { reducedMotion: 'no-preference' } })

      test('390 contact field revealed on keyboard focus', async ({ page }) => {
        await open(page)
        for (let step = 0; step < 40; step += 1) {
          await page.keyboard.press('Tab')
          const id = await page.evaluate(() => document.activeElement?.id)
          if (id === 'message') break
        }
        await expect(page.locator('#message')).toBeFocused()
        const opacity = await page
          .locator('#message')
          .evaluate(
            (node) => getComputedStyle(node.closest('[data-reveal]') ?? node).opacity,
          )
        expect(opacity).toBe('1')
      })
    })
  })

  test.describe('header at 1440', () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test('current contact link thickens on hover', async ({ page }) => {
      await open(page)
      const link = page.locator('header nav.hidden a[aria-current="page"]')
      const height = () =>
        link.evaluate((node) => getComputedStyle(node, '::after').height)
      await expect.poll(height).toBe('1px')
      await link.hover()
      await expect.poll(height).toBe('2px')
    })
  })

  test.describe('menu at 390', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('390 mobile menu on contact keeps one accent CTA', async ({ page }) => {
      await open(page)
      const toggle = page.getByRole('button', { name: ui.openMenu })
      await toggle.click()
      const menu = page.locator('#mobile-nav')
      await expect(menu).toBeVisible()
      for (const item of nav) {
        await expect(menu.getByRole('link', { name: item.label })).toBeVisible()
      }
      await expect(menu.getByRole('link')).toHaveCount(nav.length + 1)
      await expect(menu.getByRole('link', { name: 'Contact' })).toHaveAttribute(
        'aria-current',
        'page',
      )
      const cta = menu.getByRole('link', { name: ui.bookCall })
      await expect(cta).toBeInViewport()
      await page.waitForFunction(() =>
        [...document.querySelectorAll('#mobile-nav [style*="--i"]')].every(
          (element) => getComputedStyle(element).opacity === '1',
        ),
      )
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
      await page.keyboard.press('Escape')
      await expect(menu).toBeHidden()
      await expect(page.getByRole('button', { name: ui.openMenu })).toBeFocused()
    })
  })

  test('contact validation errors use the brand token', async ({ page }) => {
    await open(page)
    await submit(page)
    const brand = await tokenColor(page, '--color-brand')
    await expect
      .poll(() =>
        page.locator('#name-error').evaluate((node) => getComputedStyle(node).color),
      )
      .toBe(brand)
  })

  test('contact sends exactly one request per valid submit', async ({ page }) => {
    await open(page)
    await submitWith(page, reply(200, { reference: REFERENCE }))
    await expectStatus(page, `${ui.formSuccess} ${ui.formReference} ${REFERENCE}.`)
    expect(mock.requests).toHaveLength(1)
  })

  test('contact form exposes status', async ({ page }) => {
    await open(page)
    const form = page.locator('form[data-status]')
    await expect(form).toHaveAttribute('data-status', 'idle')
    await expect(form).not.toHaveAttribute('data-error', /.*/)
    await submitWith(page, reply(200, { reference: REFERENCE }))
    await expect(form).toHaveAttribute('data-status', 'sent')
    await expect(form).toHaveAttribute('aria-busy', 'false')
    await expect(form).not.toHaveAttribute('data-error', /.*/)
    mock.responder = reply(500, {})
    await page.locator('#message').fill('Another message long enough to pass validation.')
    await expect(form).toHaveAttribute('data-status', 'idle')
    await submit(page)
    await expect(form).toHaveAttribute('data-status', 'error')
    await expect(form).toHaveAttribute('data-error', 'server')
  })
})

test.describe('fallback', () => {
  test.skip(builtWithEndpoint(), 'needs a build without the contact endpoint')

  test.use({ viewport: { width: 1440, height: 900 } })

  for (const motion of ['reduce', 'no-preference'] as const) {
    test.describe(motion, () => {
      test.use({ contextOptions: { reducedMotion: motion } })

      test(`contact fallback idle passes axe at 1440 ${motion}`, async ({ page }) => {
        await open(page)
        await expect(page.getByText(ui.contactNotLive)).toBeVisible()
        await expectNoViolations(page)
      })

      test(`contact fallback lab prefill passes axe at 1440 ${motion}`, async ({
        page,
      }) => {
        await open(page, labHash())
        await expect(page.getByText(contactLabCopy.added)).toBeVisible()
        await expectNoViolations(page)
        expect(mock.requests).toHaveLength(0)
      })
    })
  }
})
