import type { Page } from '@playwright/test'

export const ROUTES = [
  '/',
  '/services/',
  '/work/',
  '/about/',
  '/process/',
  '/contact/',
  '/careers/',
  '/privacy/',
  '/terms/',
] as const

export function trackThreeRequests(page: Page): () => Promise<string[]> {
  const pending: Promise<string | null>[] = []
  page.on('response', (response) => {
    if (!/\.js(\?|$)/.test(response.url())) return
    pending.push(
      response
        .text()
        .then((body) => (body.includes('THREE.WebGLRenderer: ') ? response.url() : null))
        .catch(() => null),
    )
  })
  return async () => (await Promise.all(pending)).filter((url) => url !== null)
}
