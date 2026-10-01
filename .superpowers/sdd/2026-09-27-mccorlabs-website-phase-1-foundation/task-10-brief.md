## Task 10: sitemap and robots

**Files:**
- Create: `app/web/src/app/sitemap.ts`, `app/web/src/app/robots.ts`, `app/web/src/app/seo.test.ts`

**Interfaces:**
- Consumes: Tasks 7 and 9.
- Produces: `out/sitemap.xml` and `out/robots.txt` driven by `env.siteUrl`.

- [ ] **Step 1: Write the failing SEO test**

Create `app/web/src/app/seo.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import robots from './robots'
import sitemap from './sitemap'
import { footerNav } from '@/content/nav'

describe('sitemap', () => {
  it('lists the home route and every footer destination', () => {
    const entries = sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://mccorlabs.com/')
    for (const item of footerNav) {
      expect(urls).toContain(`https://mccorlabs.com${item.href}`)
    }
  })

  it('never emits a duplicate url', () => {
    const urls = sitemap().map((e) => e.url)
    expect(new Set(urls).size).toBe(urls.length)
  })
})

describe('robots', () => {
  it('allows crawling and points at the sitemap', () => {
    const result = robots()
    expect(result.sitemap).toBe('https://mccorlabs.com/sitemap.xml')
    expect(result.rules).toMatchObject({ userAgent: '*', allow: '/' })
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm -F web exec vitest run src/app/seo.test.ts`
Expected: FAIL — cannot resolve `./robots`.

- [ ] **Step 3: Create the sitemap**

Create `app/web/src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next'

import { footerNav } from '@/content/nav'
import { env } from '@/lib/env'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const paths = ['/', ...footerNav.map((item) => item.href)]
  const unique = [...new Set(paths)]

  return unique.map((path) => ({
    url: `${env.siteUrl}${path}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }))
}
```

- [ ] **Step 4: Create robots**

Create `app/web/src/app/robots.ts`:

```ts
import type { MetadataRoute } from 'next'

import { env } from '@/lib/env'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${env.siteUrl}/sitemap.xml`,
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm -F web exec vitest run src/app/seo.test.ts`
Expected: PASS.

- [ ] **Step 6: Verify both files land in the export**

```bash
pnpm -F web build
test -f app/web/out/sitemap.xml && echo "ok sitemap"
test -f app/web/out/robots.txt && echo "ok robots"
grep -c '<url>' app/web/out/sitemap.xml
```

Expected: both `ok` lines, and a count of 9 (home plus eight footer destinations, deduplicated).

- [ ] **Step 7: Commit**

```bash
git add app/web/src/app/sitemap.ts app/web/src/app/robots.ts app/web/src/app/seo.test.ts
git commit -m "feat(web): static sitemap and robots driven by env"
```

---

