import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Route } from '@playwright/test'

import { contactLabCopy } from '@/content/lab/copy'
import { EMPTY_ANSWERS, QUESTION_KEYS, classifyStep } from '@/content/lab/rubric'
import { nav } from '@/content/nav'
import { site } from '@/content/site'
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

function sweepCount(page: Page) {
  return page.evaluate(
    () =>
      document
        .getAnimations()
        .filter((animation) => (animation as CSSAnimation).animationName === 'send-sweep')
        .length,
  )
}

function liveAnimations(page: Page) {
  return page.evaluate(() =>
    document.getAnimations().map((animation) => {
      const target = (animation.effect as KeyframeEffect | null)?.target ?? null
      const name =
        'animationName' in animation
          ? (animation.animationName as string)
          : (animation as CSSTransition).transitionProperty
      const tag = target?.tagName ?? ''
      const id = target?.id ?? ''
      const classes = (target?.getAttribute('class') ?? '').slice(0, 80)
      return `${animation.constructor.name} ${name} ${tag}#${id}.${classes}`
    }),
  )
}

async function expectStatus(page: Page, text: string) {
  await expect(page.locator('form').getByRole('status')).toHaveText(text)
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
      await expect(page.locator('form').getByRole('status')).toContainText(
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
      await expect(page.locator('form').getByRole('status')).toContainText(
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

  test('budget select matches input height and has pointer cursor', async ({ page }) => {
    await open(page)
    const name = await page.locator('#name').boundingBox()
    const budget = await page.locator('#budget').boundingBox()
    expect(name).not.toBeNull()
    expect(budget).not.toBeNull()
    expect(budget?.height).toBe(name?.height)
    await expect
      .poll(() =>
        page.locator('#budget').evaluate((node) => getComputedStyle(node).cursor),
      )
      .toBe('pointer')
  })

  test('invalid field shows brand border', async ({ page }) => {
    await open(page)
    await submit(page)
    const brand = await tokenColor(page, '--color-brand')
    await expect
      .poll(() =>
        page.locator('#name').evaluate((node) => getComputedStyle(node).borderColor),
      )
      .toBe(brand)
    await page.locator('#name').fill('Ada Lovelace')
    await page.locator('#message').fill('A message long enough to pass validation.')
    await page.locator('#email').fill('not-an-email')
    await page.locator('#email').press('Enter')
    await expect(page.locator('#email-error')).toBeVisible()
    await expect(page.locator('#email')).toBeFocused()
    await expect
      .poll(() =>
        page.locator('#email').evaluate((node) => getComputedStyle(node).outlineColor),
      )
      .toBe(brand)
  })

  test('label accent follows only the focused field', async ({ page }) => {
    await open(page)
    const accent = await tokenColor(page, '--color-accent')
    await page.locator('#name').focus()
    const color = (id: string) =>
      page.locator(`label[for="${id}"]`).evaluate((node) => getComputedStyle(node).color)
    await expect.poll(() => color('name')).toBe(accent)
    expect(await color('email')).not.toBe(accent)
  })

  test('message hairline tracks the minimum', async ({ page }) => {
    await open(page)
    const field = page.locator('[data-message-field]')
    await page.locator('#message').fill('hello')
    await expect
      .poll(() => field.evaluate((node) => node.style.getPropertyValue('--fill')))
      .toBe('0.5')
    await expect(field).not.toHaveAttribute('data-met', 'true')
    await page.locator('#message').fill('hello world')
    await expect(field).toHaveAttribute('data-met', 'true')
    const accent = await tokenColor(page, '--color-accent')
    await expect
      .poll(() =>
        page
          .locator('[data-message-bar]')
          .evaluate((node) => getComputedStyle(node).backgroundColor),
      )
      .toBe(accent)
  })

  test.describe('reduced motion', () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } })

    test('message hairline jumps under reduced motion', async ({ page }) => {
      await open(page)
      await page.locator('#message').fill('hello')
      const bar = page.locator('[data-message-bar]')
      const duration = await bar.evaluate(
        (node) => getComputedStyle(node).transitionDuration,
      )
      expect(duration).toBe('0s')
      expect(await liveAnimations(page)).toEqual([])
    })

    test('sending bar is static under reduced motion', async ({ page }) => {
      await open(page)
      const pending = gated()
      mock.release = pending.release
      await submitWith(page, pending.responder)
      const bar = page.locator('[data-send-bar]')
      await expect(bar).toBeVisible()
      const transform = await bar.evaluate((node) => getComputedStyle(node).transform)
      expect(transform).toBe('none')
      const track = await page.locator('[data-send-track]').boundingBox()
      const fill = await bar.boundingBox()
      expect(fill?.width).toBe(track?.width)
      expect(await liveAnimations(page)).toEqual([])
    })

    test('chevron stays still under reduced motion', async ({ page }) => {
      await open(page)
      await page.locator('#budget').focus()
      const transform = await page
        .locator('[data-select-chevron]')
        .evaluate((node) => getComputedStyle(node).transform)
      expect(transform).toBe('none')
      expect(await liveAnimations(page)).toEqual([])
    })
  })

  test('sending state is busy and read-only', async ({ page }) => {
    await open(page)
    const pending = gated()
    mock.release = pending.release
    await submitWith(page, pending.responder)
    const form = page.locator('form')
    await expect(form).toHaveAttribute('aria-busy', 'true')
    await expect(page.locator('#name')).toHaveJSProperty('readOnly', true)
    await expect(page.locator('#budget')).toHaveJSProperty('disabled', false)
    const opacity = await page
      .getByRole('button', { name: ui.formSending })
      .evaluate((node) => getComputedStyle(node).opacity)
    expect(opacity).toBe('1')
    await expect.poll(() => sweepCount(page)).toBe(1)
    pending.release()
    await expect(form).toHaveAttribute('data-status', 'sent')
    await expect(form).toHaveAttribute('aria-busy', 'false')
    await expect(page.locator('[data-send-track]')).toHaveCount(0)
    await expect.poll(() => sweepCount(page)).toBe(0)
  })

  test('server errors are tiered', async ({ page }) => {
    const tiers = [
      {
        reply: reply(429, { reason: 'daily_cap' }),
        text: ui.formErrorDailyCap,
        rule: '--color-brand',
        ink: '--color-text',
      },
      {
        reply: reply(500, {}),
        text: ui.formErrorServer,
        rule: '--color-brand',
        ink: '--color-text',
      },
      {
        reply: reply(429, {}),
        text: ui.formErrorRateLimit,
        rule: '--color-border-strong',
        ink: '--color-muted',
      },
      {
        reply: reply(400, { reason: 'too_fast' }),
        text: ui.formErrorTooFast,
        rule: '--color-border-strong',
        ink: '--color-muted',
      },
      {
        reply: reply(400, {}),
        text: ui.formErrorValidation,
        rule: null,
        ink: '--color-brand',
      },
    ]
    await open(page)
    for (const tier of tiers) {
      mock.responder = tier.reply
      await page.locator('#name').fill('Ada Lovelace')
      await page.locator('#email').fill('ada@example.com')
      await page
        .locator('#message')
        .fill(`Message long enough to pass validation ${tier.text.slice(0, 8)}.`)
      await submit(page)
      const status = page.locator('form').getByRole('status')
      await expect(status).toHaveText(tier.text)
      const ink = await tokenColor(page, tier.ink)
      await expect
        .poll(() => status.evaluate((node) => getComputedStyle(node).color))
        .toBe(ink)
      const wrap = page.locator('[data-status-wrap]')
      if (tier.rule !== null) {
        const rule = await tokenColor(page, tier.rule)
        await expect
          .poll(() => wrap.evaluate((node) => getComputedStyle(node).borderLeftColor))
          .toBe(rule)
      }
      await expectNoViolations(page)
    }
  })

  test('status mailto link has hover and press states', async ({ page }) => {
    await open(page)
    await submitWith(page, reply(500, {}))
    const link = page.locator('[data-status-wrap] a')
    await expect(link).toBeVisible()
    await link.hover()
    const hover = await tokenColor(page, '--color-accent-hover')
    await expect
      .poll(() => link.evaluate((node) => getComputedStyle(node).color))
      .toBe(hover)
    await expect
      .poll(() => link.evaluate((node) => getComputedStyle(node).textDecorationThickness))
      .toBe('2px')
    await page.mouse.down()
    const press = await tokenColor(page, '--color-text')
    await expect
      .poll(() => link.evaluate((node) => getComputedStyle(node).color))
      .toBe(press)
    await page.mouse.up()
  })

  test.describe('server error at 390', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('390 server error callout keeps the mailto in view', async ({ page }) => {
      await open(page)
      await submitWith(page, reply(500, {}))
      const link = page.locator('[data-status-wrap] a')
      await expect(link).toBeVisible()
      const box = await link.boundingBox()
      expect(box).not.toBeNull()
      expect(box?.x).toBeGreaterThanOrEqual(0)
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390)
      await noOverflow(page)
    })
  })

  test.describe('invalid focus with motion', () => {
    test.use({
      viewport: { width: 1440, height: 500 },
      contextOptions: { reducedMotion: 'no-preference' },
    })

    test('first invalid field takes focus below the header', async ({ page }) => {
      await open(page)
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })
      await submit(page)
      await expect(page.locator('#name')).toBeFocused()
      const header = await page.locator('header').first().boundingBox()
      await expect
        .poll(async () => (await page.locator('#name').boundingBox())?.y ?? 0)
        .toBeGreaterThan(header?.height ?? 64)
    })
  })

  test.describe('panel at 1440', () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test('panel sits beside aside at 1440', async ({ page }) => {
      await open(page)
      const panel = await page.locator('form').locator('xpath=..').boundingBox()
      const aside = await page.locator('aside').boundingBox()
      expect(panel).not.toBeNull()
      expect(aside).not.toBeNull()
      if (panel === null || aside === null) return
      expect(aside.x).toBeGreaterThanOrEqual(panel.x + panel.width)
      expect(Math.abs(aside.y - panel.y)).toBeLessThan(2)
      await noOverflow(page)
    })
  })

  test.describe('panel at 390', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('390 panel stacks form before aside without overflow', async ({ page }) => {
      await open(page)
      const form = await page.locator('form').boundingBox()
      const aside = await page.locator('aside').boundingBox()
      expect(form).not.toBeNull()
      expect(aside).not.toBeNull()
      if (form === null || aside === null) return
      expect(aside.y).toBeGreaterThanOrEqual(form.y + form.height)
      await noOverflow(page)
    })
  })

  for (const motion of ['reduce', 'no-preference'] as const) {
    test.describe(`receipt ${motion}`, () => {
      test.use({ contextOptions: { reducedMotion: motion } })

      test(`success becomes a receipt ${motion}`, async ({ page }) => {
        await open(page)
        await submitWith(page, reply(200, { reference: REFERENCE }))
        const status = page.locator('form').getByRole('status')
        await expect(status).toHaveText(
          `${ui.formSuccess} ${ui.formReference} ${REFERENCE}.`,
        )
        const ink = await tokenColor(page, '--color-text')
        await expect
          .poll(() => status.evaluate((node) => getComputedStyle(node).color))
          .toBe(ink)
        const heading = page.getByRole('heading', { name: ui.contactReceiptHeading })
        await expect(heading).toBeVisible()
        await expect(heading).toBeFocused()
        await expect(page.locator('[data-receipt-reference]')).toHaveText(REFERENCE)
        const stack = page.locator('form > [inert]')
        await expect(stack).toHaveCount(1)
        await expect
          .poll(() => stack.evaluate((node) => node.getBoundingClientRect().height))
          .toBe(0)
        await expect(page.getByText(ui.contactToastSent)).toBeVisible()
        await expect(
          page.getByRole('button', { name: /send another|reset/i }),
        ).toHaveCount(0)
        await expectNoViolations(page)
        await expect(page.getByText(ui.contactToastSent)).toBeHidden({ timeout: 8000 })
      })
    })
  }

  test('sent toast is static under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page)
    await submitWith(page, reply(200, { reference: REFERENCE }))
    await expect(page.getByText(ui.contactToastSent)).toBeVisible()
    expect(await liveAnimations(page)).toEqual([])
  })

  test.describe('receipt at 390', () => {
    test.use({
      viewport: { width: 390, height: 844 },
      contextOptions: { reducedMotion: 'no-preference' },
    })

    test('390 receipt fits the panel', async ({ page }) => {
      await open(page)
      await submitWith(page, reply(200, { reference: REFERENCE }))
      const reference = page.locator('[data-receipt-reference]')
      await expect(reference).toBeVisible()
      const panel = await page.locator('form').locator('xpath=..').boundingBox()
      const box = await reference.boundingBox()
      const toast = await page.locator('[data-sent-toast] > div').boundingBox()
      expect(panel).not.toBeNull()
      expect(box).not.toBeNull()
      expect(toast).not.toBeNull()
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
        (panel?.x ?? 0) + (panel?.width ?? 0),
      )
      expect(toast?.x).toBeGreaterThanOrEqual(0)
      expect((toast?.x ?? 0) + (toast?.width ?? 0)).toBeLessThanOrEqual(390)
      expect((toast?.y ?? 0) + (toast?.height ?? 0)).toBeLessThanOrEqual(844)
      await noOverflow(page)
    })
  })

  test.describe('lab arrival at 1440', () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test('lab prefill strip has one accent pill', async ({ page }) => {
      await open(page, labHash())
      await expect(page.locator('[data-lab-strip]')).toBeVisible()
      const accent = await tokenColor(page, '--color-accent')
      const pills = await page.locator('a:visible, button:visible').evaluateAll(
        (nodes, color) =>
          nodes.filter((node) => {
            const style = getComputedStyle(node)
            return style.clipPath === 'none' && style.backgroundColor === color
          }).length,
        accent,
      )
      expect(pills).toBe(1)
      await expect(
        page.locator('aside').getByRole('link', { name: ui.bookCall }),
      ).toBeHidden()
    })

    test('fresh lab arrival shows an empty status', async ({ browser }) => {
      const context = await browser.newContext()
      const page = await context.newPage()
      await page.goto(`/contact/${labHash()}`, { waitUntil: 'networkidle' })
      await expect(page.locator('form')).toHaveAttribute('data-status', 'idle')
      await expect(page.locator('form').getByRole('status')).toHaveText('')
      await context.close()
    })
  })

  test.describe('lab arrival at 390', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('390 lab strip wraps and the prefilled message is not clipped', async ({
      page,
    }) => {
      await open(page, labHash())
      const strip = page.locator('[data-lab-strip]')
      await expect(strip).toBeVisible()
      const strips = await strip.evaluate((node) => ({
        scroll: node.scrollWidth,
        client: node.clientWidth,
      }))
      expect(strips.scroll).toBe(strips.client)
      const message = await page.locator('#message').evaluate((node) => ({
        scroll: node.scrollHeight,
        client: node.clientHeight,
      }))
      expect(message.scroll).toBeLessThanOrEqual(message.client + 1)
      await noOverflow(page)
    })
  })

  test('390 hero crop shows orb and trail', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await open(page)
    const position = () =>
      page
        .getByTestId('header-image')
        .evaluate((node) => getComputedStyle(node).objectPosition)
    expect(await position()).toBe('70% 50%')
    await page.setViewportSize({ width: 1440, height: 900 })
    expect(await position()).toBe('100% 50%')
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
    await open(page)
    await submitWith(page, reply(500, {}))
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

      test(`fallback shows the address as the hero link ${motion}`, async ({ page }) => {
        await open(page)
        const link = page.getByRole('link', { name: site.contactEmail })
        await expect(link).toHaveCount(1)
        await expect(link).toHaveAttribute('href', `mailto:${site.contactEmail}`)
        const font = await link.evaluate((node) => getComputedStyle(node).fontFamily)
        expect(font).toMatch(/mono/i)
        await expect(
          page.getByRole('button', { name: ui.contactCopyEmail }),
        ).toBeVisible()
        await expectNoViolations(page)
      })
    })
  }

  test.describe('at 390', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('390 fallback email wraps without overflow', async ({ page }) => {
      await open(page)
      await expect(page.getByRole('link', { name: site.contactEmail })).toBeVisible()
      await noOverflow(page)
    })
  })
})
