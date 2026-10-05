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
  return trackScriptsContaining(page, 'THREE.WebGLRenderer: ')
}

export function trackSceneRequests(page: Page): () => Promise<string[]> {
  return trackScriptsContaining(page, 'webglcontextlost')
}

function trackScriptsContaining(page: Page, marker: string): () => Promise<string[]> {
  const pending: Promise<string | null>[] = []
  page.on('response', (response) => {
    if (!/\.js(\?|$)/.test(response.url())) return
    pending.push(
      response
        .text()
        .then((body) => (body.includes(marker) ? response.url() : null))
        .catch(() => null),
    )
  })
  return async () => (await Promise.all(pending)).filter((url) => url !== null)
}
