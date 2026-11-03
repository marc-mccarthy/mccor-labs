import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, type Page, type Request } from '@playwright/test'

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
  forget: () => void
  wait: () => Promise<void>
}

export function trackQuietNetwork(page: Page): QuietNetwork {
  const open = new Set<Request>()
  let changedAt = Date.now()
  page.on('request', (request) => {
    if (request.resourceType() === 'media') return
    open.add(request)
    changedAt = Date.now()
  })
  const settle = (request: Request) => {
    if (open.delete(request)) changedAt = Date.now()
  }
  page.on('requestfinished', settle)
  page.on('requestfailed', settle)
  return {
    forget: () => {
      open.clear()
      changedAt = Date.now()
    },
    wait: () =>
      expect(() => {
        expect([...open].map((request) => request.url())).toEqual([])
        expect(Date.now() - changedAt).toBeGreaterThanOrEqual(QUIET_MS)
      }).toPass({ intervals: [100] }),
  }
}

export async function gotoQuiet(page: Page, url: string): Promise<void> {
  const network = trackQuietNetwork(page)
  await page.goto(url, { waitUntil: 'commit' })
  network.forget()
  await page.waitForLoadState('load')
  await network.wait()
}
