import { expect, test, type Locator, type Page } from '@playwright/test'

import { nav } from '@/content/nav'
import { ui } from '@/content/ui'

async function atViewport(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })
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

test('no horizontal overflow at 390', async ({ page }) => {
  await atViewport(page, 390, 844)
  await page.goto('/')
  await page.evaluate(async () => {
    const step = window.innerHeight
    while (window.scrollY + window.innerHeight < document.documentElement.scrollHeight) {
      window.scrollBy(0, step)
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  })
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }))
  expect(widths.scroll).toBe(widths.client)
})

test.describe('motion pause', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } })

  const toggle = (page: Page) => page.getByRole('button', { name: ui.pauseMotion })

  const loopingOrScrollLinked = (page: Page) =>
    page.evaluate(
      () =>
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.effect?.getTiming().iterations === Infinity ||
              animation.timeline !== document.timeline,
          ).length,
    )

  const unpausedActiveScenes = (page: Page) =>
    page.locator('[data-scene-status="active"]:not([data-scene-paused])').count()

  const playingVideos = (page: Page) =>
    page.evaluate(
      () =>
        [...document.querySelectorAll('video')].filter((video) => !video.paused).length,
    )

  test('motion pause stops scenes and video', async ({ page }) => {
    await atViewport(page, 1440, 900)
    await page.goto('/', { waitUntil: 'load' })
    const hero = page.locator('section video').first()
    await expect(hero).toHaveCount(1)
    await expect
      .poll(() => hero.evaluate((node: HTMLVideoElement) => node.paused))
      .toBe(false)
    await expect(page.locator('[data-scene-status="active"]')).toHaveCount(1, {
      timeout: 15_000,
    })

    await toggle(page).click()
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused')
    await expect.poll(() => playingVideos(page)).toBe(0)
    expect(await unpausedActiveScenes(page)).toBe(0)

    await page.locator('[data-testid="systems-poster"]').scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)
    expect(await playingVideos(page)).toBe(0)
    expect(await unpausedActiveScenes(page)).toBe(0)

    await toggle(page).click()
    await expect(page.locator('html')).not.toHaveAttribute('data-motion', 'paused')
    await expect(page.locator('[data-scene-paused]')).toHaveCount(0)
    await expect.poll(() => playingVideos(page), { timeout: 15_000 }).toBeGreaterThan(0)
  })

  test('motion pause stops looping and scroll-linked animations', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' })
    await expect.poll(() => loopingOrScrollLinked(page)).toBeGreaterThan(0)

    await toggle(page).click()
    await expect.poll(() => loopingOrScrollLinked(page)).toBe(0)

    await page.keyboard.press('End')
    await page.waitForTimeout(600)
    expect(await loopingOrScrollLinked(page)).toBe(0)
  })

  test('motion pause toggle is visible at 390', async ({ page }) => {
    await atViewport(page, 390, 844)
    await page.goto('/')
    await expect(toggle(page)).toBeVisible()
    await expect(toggle(page)).toBeInViewport()
  })

  test('motion pause persists across reload before hydration', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' })
    await toggle(page).click()
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused')

    await page.route(
      (url) => url.pathname.startsWith('/_next/') && url.pathname.endsWith('.js'),
      (route) => route.abort(),
    )
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused')
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false')
    expect(await loopingOrScrollLinked(page)).toBe(0)
  })
})

const heroPauseToggle = (page: Page) =>
  page.getByRole('button', { name: ui.pauseVideo }).first()

const computedOf = (
  locator: Locator,
  property: 'cursor' | 'transform' | 'outlineStyle' | 'boxShadow',
) => locator.evaluate((node, prop) => getComputedStyle(node)[prop], property)

test('pause toggle has pointer cursor', async ({ page }) => {
  await atViewport(page, 1440, 900)
  await page.goto('/')
  const toggle = heroPauseToggle(page)
  await expect(toggle).toBeVisible()
  expect(await computedOf(toggle, 'cursor')).toBe('pointer')
})

test.describe('press feedback', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } })

  test('press scales on active and pause toggle pressed border uses accent', async ({
    page,
  }) => {
    await atViewport(page, 1440, 900)
    await page.goto('/')
    const toggle = heroPauseToggle(page)
    await expect(toggle).toBeVisible()
    await toggle.hover()
    await page.mouse.down()
    await expect.poll(() => computedOf(toggle, 'transform')).not.toBe('none')
    await page.mouse.up()

    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    const accent = await tokenColor(page, '--color-accent')
    await expect
      .poll(() => toggle.evaluate((node) => getComputedStyle(node).borderTopColor))
      .toBe(accent)
  })

  test('mobile menu opens at 390 with pointer cursor and press feedback', async ({
    page,
  }) => {
    await atViewport(page, 390, 844)
    await page.goto('/')
    const button = page.getByRole('button', { name: ui.openMenu })
    expect(await computedOf(button, 'cursor')).toBe('pointer')
    await button.click()
    const menu = page.locator('#mobile-nav')
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('link')).toHaveCount(nav.length + 1)
    const link = menu.getByRole('link').first()
    await expect(link).toHaveClass(/\bpress\b/)
    await link.hover()
    await page.mouse.down()
    await expect.poll(() => computedOf(link, 'transform')).not.toBe('none')
    await page.mouse.up()
  })

  test('footer links carry press feedback', async ({ page }) => {
    await atViewport(page, 1440, 900)
    await page.goto('/')
    const links = page.locator('nav[aria-label="Footer"] a')
    const count = await links.count()
    expect(count).toBeGreaterThan(0)
    for (let index = 0; index < count; index += 1) {
      await expect(links.nth(index)).toHaveClass(/\bpress\b/)
    }
    const link = links.first()
    await link.scrollIntoViewIfNeeded()
    await link.hover()
    await page.mouse.down()
    await expect.poll(() => computedOf(link, 'transform')).not.toBe('none')
    await page.mouse.up()
  })
})

test.describe('service cards', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } })

  test('service card shows hover lift, press and card-edge focus ring', async ({
    page,
  }) => {
    await atViewport(page, 1440, 900)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const card = page.locator('[data-service]').first()
    const link = card.getByRole('link')
    await card.scrollIntoViewIfNeeded()
    await card.hover()
    await expect.poll(() => computedOf(card, 'transform')).not.toBe('none')
    const strong = await tokenColor(page, '--color-border-strong')
    await expect
      .poll(() => card.evaluate((node) => getComputedStyle(node).borderTopColor))
      .toBe(strong)
    const lifted = await computedOf(card, 'transform')
    await page.mouse.down()
    await expect.poll(() => computedOf(card, 'transform')).not.toBe(lifted)
    await page.mouse.move(0, 0)
    await page.mouse.up()

    await page.evaluate(() => {
      window.scrollTo(0, 0)
    })
    for (let step = 0; step < 40; step += 1) {
      await page.keyboard.press('Tab')
      if (await link.evaluate((node) => node === document.activeElement)) break
    }
    await expect(link).toBeFocused()
    await expect
      .poll(() => card.evaluate((node) => getComputedStyle(node).outlineStyle))
      .not.toBe('none')
    expect(await computedOf(link, 'outlineStyle')).toBe('none')
    const linkShadow = await computedOf(link, 'boxShadow')
    expect(
      linkShadow.replaceAll('rgba(0, 0, 0, 0) 0px 0px 0px 0px', '').replace(/[,\s]/g, ''),
    ).toBe('')
  })
})

test.describe('systems gates', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } })

  const stage = (page: Page) => page.getByTestId('systems-stage')
  const evaluationLink = (page: Page) => page.getByRole('link', { name: ui.systemsLink })

  async function pinSystems(page: Page, fraction: number) {
    await stage(page).waitFor()
    await page.evaluate((at) => {
      const pin = document.querySelector('[data-testid="systems-stage"]')?.parentElement
        ?.parentElement
      if (!pin) throw new Error('systems pin not found')
      const top = window.scrollY + pin.getBoundingClientRect().top
      window.scrollTo(0, top + at * (pin.offsetHeight - window.innerHeight))
    }, fraction)
    await expect
      .poll(() =>
        stage(page).evaluate((node) => Math.abs(node.getBoundingClientRect().top)),
      )
      .toBeLessThan(1)
  }

  test('systems copy, gates and link fit the 390 viewport while pinned', async ({
    page,
  }) => {
    await atViewport(page, 390, 844)
    await page.goto('/', { waitUntil: 'load' })
    await pinSystems(page, 0.6)
    const headerBox = await page.locator('header').first().boundingBox()
    const headingBox = await page
      .getByRole('heading', { level: 2, name: ui.systemsHeading })
      .boundingBox()
    const gatesBox = await page.getByTestId('systems-gates').boundingBox()
    const linkBox = await evaluationLink(page).boundingBox()
    expect(headerBox && headingBox && gatesBox && linkBox).toBeTruthy()
    expect(headingBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height)
    expect(gatesBox!.y + gatesBox!.height).toBeLessThanOrEqual(linkBox!.y)
    expect(linkBox!.y + linkBox!.height).toBeLessThanOrEqual(844)
    await expect(evaluationLink(page)).toBeVisible()
    await expect
      .poll(() =>
        page.locator('[data-testid="systems-gates"] [data-state="passed"]').count(),
      )
      .toBe(2)
  })

  test('systems evaluation link has hover, press and focus states', async ({ page }) => {
    await atViewport(page, 1440, 900)
    await page.goto('/', { waitUntil: 'load' })
    const link = evaluationLink(page)
    for (let step = 0; step < 60; step += 1) {
      await page.keyboard.press('Tab')
      if (await link.evaluate((node) => node === document.activeElement)) break
    }
    await expect(link).toBeFocused()
    expect(await computedOf(link, 'outlineStyle')).not.toBe('none')

    await pinSystems(page, 0.6)
    const underline = () =>
      link.evaluate((node) => {
        const after = getComputedStyle(node, '::after')
        return `${after.transform} ${after.scale}`
      })
    await page.mouse.move(0, 0)
    const resting = await underline()
    await link.hover()
    await expect.poll(underline).not.toBe(resting)

    await page.mouse.down()
    await expect.poll(() => computedOf(link, 'transform')).not.toBe('none')
    await page.mouse.move(0, 0)
    await page.mouse.up()
  })
})

test.describe('process track', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } })

  const processStage = (page: Page) => page.getByTestId('process-stage')

  async function pinProcess(page: Page, fraction: number) {
    await processStage(page).waitFor()
    await page.evaluate((at) => {
      const pin = document.querySelector('[data-testid="process-stage"]')?.parentElement
        ?.parentElement
      if (!pin) throw new Error('process pin not found')
      const top = window.scrollY + pin.getBoundingClientRect().top
      window.scrollTo(0, top + at * (pin.offsetHeight - window.innerHeight))
    }, fraction)
    await expect
      .poll(() =>
        processStage(page).evaluate((node) => Math.abs(node.getBoundingClientRect().top)),
      )
      .toBeLessThan(1)
  }

  test('process track shows no clipped card at rest at 1440', async ({ page }) => {
    await atViewport(page, 1440, 900)
    await page.goto('/', { waitUntil: 'load' })
    await pinProcess(page, 0)
    await expect
      .poll(() =>
        page
          .getByTestId('process-group')
          .evaluate((node) => node.style.getPropertyValue('--track-shift')),
      )
      .toBe('0px')
    const edges = await page.getByTestId('process-clip').evaluate((clip) => ({
      clipRight: clip.getBoundingClientRect().right,
      cards: [...clip.querySelectorAll('[data-process-card]')].map((card) => {
        const rect = card.getBoundingClientRect()
        return { left: rect.left, right: rect.right }
      }),
    }))
    const shown = edges.cards.filter((card) => card.left < edges.clipRight)
    expect(shown.length).toBeGreaterThan(0)
    for (const card of shown) {
      expect(card.right).toBeLessThanOrEqual(edges.clipRight + 1)
    }
  })

  test('process stage content is centred while pinned at 1440', async ({ page }) => {
    await atViewport(page, 1440, 900)
    await page.goto('/', { waitUntil: 'load' })
    await pinProcess(page, 0.5)
    const centre = await page.getByTestId('process-group').evaluate((node) => {
      const rect = node.getBoundingClientRect()
      return rect.top + rect.height / 2
    })
    expect(Math.abs(centre - 900 / 2)).toBeLessThanOrEqual(900 * 0.1)
  })

  test('process cards keep full-opacity text', async ({ page }) => {
    await atViewport(page, 1440, 900)
    await page.goto('/', { waitUntil: 'load' })
    const cards = page.locator('[data-process-card]')
    await expect(cards).toHaveCount(5)
    const opacities = await cards.evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).opacity),
    )
    expect(opacities).toEqual(['1', '1', '1', '1', '1'])
  })

  test('process stack shows a rail at 390', async ({ page }) => {
    await atViewport(page, 390, 844)
    await page.goto('/', { waitUntil: 'load' })
    const track = page.locator('[data-testid="process-clip"] ol')
    await track.evaluate((node) => {
      node.scrollIntoView({ block: 'center' })
    })
    const rail = page.locator('[data-process-rail]')
    await expect(rail).toBeVisible()
    const heights = await rail.evaluate((node: HTMLElement) => ({
      rail: node.offsetHeight,
      track: node.parentElement?.querySelector('ol')?.offsetHeight ?? 0,
    }))
    expect(heights.track).toBeGreaterThan(0)
    expect(Math.abs(heights.rail - heights.track)).toBeLessThanOrEqual(2)
  })
})
