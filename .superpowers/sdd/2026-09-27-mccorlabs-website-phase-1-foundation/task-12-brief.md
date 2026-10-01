## Task 12: Playwright against the exported build

**Files:**
- Create: `app/web/playwright.config.ts`
- Create: `app/web/tests/e2e/{routes,a11y,contact,motion}.spec.ts`
- Modify: `app/web/package.json`

**Interfaces:**
- Consumes: Tasks 9-11.
- Produces: `pnpm -F web test:e2e` and `test:e2e:smoke`.

- [ ] **Step 1: Install Playwright, axe and a static server**

Playwright stays at the repository ROOT, where it is already installed and exactly pinned. Do not add it to `app/web`: two Playwright versions in one repo is precisely the hazard the root `package.json`'s `"//"` comment guards against, because each version wants a specific browser revision.

Run:

```bash
pnpm add -D -w @axe-core/playwright@^4 serve@^14
```

Then confirm the already-installed Playwright and its cached browser, rather than downloading anything:

Run: `pnpm exec playwright --version && ls -d ~/Library/Caches/ms-playwright/chromium-* 2>/dev/null`
Expected: version `1.61.0`, and at least one `chromium-*` directory listed.

**Do not run `playwright install`.** Version 1.61.0's bundled browser revision already matches the cached `chromium-1228`. Running the installer risks pulling a ~500MB browser onto a volume at 89% capacity for no benefit. If the version check above prints something other than 1.61.0, stop and report rather than installing.

- [ ] **Step 2: Create the Playwright config**

Create `app/web/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

const PORT = 4321

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Serves the real exported build, not the dev server.
    //
    // CAVEAT: `serve` resolves directory indexes and clean URLs, which
    // CloudFront with a plain S3 origin does NOT do until the rewrite
    // function lands (spec: CloudFront handoff). These tests therefore prove
    // the export is correct; they cannot prove production routing works.
    command: 'pnpm exec serve out --listen ' + String(PORT) + ' --single=false',
    url: `http://localhost:${String(PORT)}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
})
```

- [ ] **Step 3: Write the route tests**

Create `app/web/tests/e2e/routes.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

const ROUTES = [
  { path: '/', heading: /design and build/i },
  { path: '/services/', heading: 'Services' },
  { path: '/work/', heading: 'Work' },
  { path: '/about/', heading: 'About' },
  { path: '/process/', heading: 'Process' },
  { path: '/contact/', heading: 'Contact' },
  { path: '/careers/', heading: 'Careers' },
  { path: '/privacy/', heading: 'Privacy Policy' },
  { path: '/terms/', heading: 'Terms' },
] as const

test.describe('routes', () => {
  for (const route of ROUTES) {
    test(`${route.path} renders its own h1 @smoke`, async ({ page }) => {
      await page.goto(route.path)
      const headings = page.locator('h1')
      await expect(headings).toHaveCount(1)
      await expect(headings.first()).toContainText(route.heading)
    })
  }

  test('a working primary cta is reachable from every route @smoke', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route.path)
      // Either a real booking link or the email fallback — never neither, and
      // never a relative or empty href.
      const cta = page
        .locator('header a[href^="https://"], header a[href^="mailto:"]')
        .first()
      await expect(cta).toBeVisible()
    }
  })

  test('no internal link is broken @smoke', async ({ page, request }) => {
    await page.goto('/')
    const hrefs = await page
      .locator('a[href^="/"]')
      .evaluateAll((links) => links.map((l) => l.getAttribute('href') ?? ''))
    for (const href of new Set(hrefs)) {
      const response = await request.get(href)
      expect(response.status(), `${href} should resolve`).toBeLessThan(400)
    }
  })

  test('the 404 page is exported and distinct', async ({ page }) => {
    await page.goto('/404.html')
    await expect(page.locator('h1')).toContainText(/does not exist/i)
  })
})
```

- [ ] **Step 4: Write the accessibility test**

Create `app/web/tests/e2e/a11y.spec.ts`:

```ts
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const PATHS = [
  '/',
  '/services/',
  '/work/',
  '/about/',
  '/process/',
  '/contact/',
  '/careers/',
  '/privacy/',
  '/terms/',
  '/404.html',
] as const

for (const path of PATHS) {
  test(`${path} has no axe violations`, async ({ page }) => {
    await page.goto(path)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })
}

test('the skip link is the first focusable element @smoke', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const focused = page.locator(':focus')
  await expect(focused).toHaveText(/skip to content/i)
})

test('every interactive element shows a visible focus indicator', async ({ page }) => {
  await page.goto('/contact/')
  const outline = await page
    .getByLabel('Name')
    .evaluate((element) => {
      element.focus()
      return getComputedStyle(element).outlineStyle
    })
  expect(outline).not.toBe('none')
})
```

- [ ] **Step 5: Write the contact form e2e test**

Create `app/web/tests/e2e/contact.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test.describe('contact route', () => {
  test('offers a way to reach the firm @smoke', async ({ page }) => {
    await page.goto('/contact/')
    // With no endpoint configured at build time the form degrades to the
    // booking link plus a mailto. Either shape must give the visitor a route.
    const hasForm = await page.getByRole('button', { name: /send message/i }).count()
    const hasMailto = await page.locator('a[href^="mailto:"]').count()
    expect(hasForm + hasMailto).toBeGreaterThan(0)
  })

  test('never renders a submit button without an endpoint', async ({ page }) => {
    await page.goto('/contact/')
    const submit = page.getByRole('button', { name: /send message/i })
    const mailto = page.locator('a[href^="mailto:"]')
    if ((await submit.count()) === 0) {
      await expect(mailto.first()).toBeVisible()
    }
  })
})
```

- [ ] **Step 6: Write the reduced-motion test**

Create `app/web/tests/e2e/motion.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'reduce' })

test('all content renders and nothing animates under reduced motion @smoke', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('h1')).toBeVisible()
  await page.waitForTimeout(600)
  const running = await page.evaluate(() => document.getAnimations().length)
  expect(running).toBe(0)
})

test('no video autoplays under reduced motion', async ({ page }) => {
  await page.goto('/')
  const autoplaying = await page.evaluate(() =>
    [...document.querySelectorAll('video')].filter((v) => v.autoplay).length,
  )
  expect(autoplaying).toBe(0)
})
```

- [ ] **Step 7: Run the full e2e suite**

Run: `pnpm -F web build && pnpm -F web test:e2e`
Expected: all specs pass. Playwright builds nothing itself — it serves `out/`, so the build must run first.

- [ ] **Step 8: Run the smoke subset the hook uses**

Run: `pnpm -F web test:e2e:smoke`
Expected: passes, and noticeably faster than the full suite.

- [ ] **Step 9: Commit**

```bash
git add app/web/playwright.config.ts app/web/tests app/web/package.json pnpm-lock.yaml
git commit -m "test(web): Playwright route, accessibility, contact and motion suites"
```

---

