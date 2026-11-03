import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, type Frame, type Page, type Request } from '@playwright/test'

const CHUNKS_DIR = fileURLToPath(
  new URL('../../out/_next/static/chunks', import.meta.url),
)
const QUIET_MS = 500

export function builtWithEndpoint(chunksDir: string = CHUNKS_DIR): boolean {
  if (!existsSync(chunksDir)) return false
  return readdirSync(chunksDir, { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith('.js'))
    .some((name) => readFileSync(join(chunksDir, name), 'utf8').includes('/api/contact'))
}

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
  '/lab/should-this-be-ai/',
  '/lab/evals/',
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

interface QuietNetwork {
  wait: () => Promise<void>
  stop: () => void
}

export function trackQuietNetwork(page: Page): QuietNetwork {
  const open = new Set<Request>()
  let changedAt = Date.now()
  let navigating = false
  const onRequest = (request: Request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      navigating = true
    }
    if (request.resourceType() === 'media') return
    open.add(request)
    changedAt = Date.now()
  }
  const onSettled = (request: Request) => {
    if (open.delete(request)) changedAt = Date.now()
  }
  const onNavigated = (frame: Frame) => {
    if (!navigating || frame !== page.mainFrame()) return
    navigating = false
    open.clear()
    changedAt = Date.now()
  }
  page.on('request', onRequest)
  page.on('requestfinished', onSettled)
  page.on('requestfailed', onSettled)
  page.on('framenavigated', onNavigated)
  return {
    wait: () =>
      expect(() => {
        expect([...open].map((request) => request.url())).toEqual([])
        expect(Date.now() - changedAt).toBeGreaterThanOrEqual(QUIET_MS)
      }).toPass({ intervals: [100] }),
    stop: () => {
      page.off('request', onRequest)
      page.off('requestfinished', onSettled)
      page.off('requestfailed', onSettled)
      page.off('framenavigated', onNavigated)
    },
  }
}

export async function gotoQuiet(page: Page, url: string): Promise<void> {
  const network = trackQuietNetwork(page)
  try {
    await page.goto(url)
    await network.wait()
  } finally {
    network.stop()
  }
}
