import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

import { ROUTES } from './support'

interface Violation {
  blockedURI: string
  violatedDirective: string
  sourceFile: string
  lineNumber: number
}

const MAIN_TF = fileURLToPath(
  new URL('../../../../infra/modules/static_site/main.tf', import.meta.url),
)
const UNKNOWN_ROUTE = '/csp-unknown-route/'

function readPolicy(): string {
  const match = /^\s*csp\s*=\s*"([^"]+)"/m.exec(readFileSync(MAIN_TF, 'utf8'))
  if (!match?.[1]) {
    throw new Error(`No csp = "..." line found in ${MAIN_TF}`)
  }
  return match[1]
}

const csp = readPolicy()

for (const route of [...ROUTES, UNKNOWN_ROUTE]) {
  test(`${route} raises no CSP violation under the enforced policy`, async ({ page }) => {
    const problems: string[] = []

    await page.route('**/*', async (handler) => {
      if (handler.request().resourceType() !== 'document') {
        await handler.continue()
        return
      }
      const response = await handler.fetch()
      const isHtml = (response.headers()['content-type'] ?? '').includes('text/html')
      await handler.fulfill({
        response,
        headers: isHtml
          ? { ...response.headers(), 'content-security-policy': csp }
          : response.headers(),
      })
    })
    await page.addInitScript(() => {
      const holder = window as unknown as { cspViolations: Violation[] }
      holder.cspViolations = []
      document.addEventListener('securitypolicyviolation', (event) => {
        holder.cspViolations.push({
          blockedURI: event.blockedURI,
          violatedDirective: event.violatedDirective,
          sourceFile: event.sourceFile,
          lineNumber: event.lineNumber,
        })
      })
    })
    page.on('console', (message) => {
      if (message.type() !== 'error') return
      const { url, lineNumber } = message.location()
      if (route === UNKNOWN_ROUTE && url.endsWith(UNKNOWN_ROUTE)) return
      problems.push(`console error: ${message.text()} (${url}:${String(lineNumber)})`)
    })
    page.on('pageerror', (error) => {
      problems.push(`page error: ${error.message}`)
    })

    const navigation = await page.goto(route, { waitUntil: 'load' })
    expect(navigation?.headers()['content-security-policy']).toBe(csp)

    for (let step = 0; step < 60; step += 1) {
      const atBottom = await page.evaluate(
        () => window.scrollY + window.innerHeight >= document.body.scrollHeight - 2,
      )
      if (atBottom) break
      await page.mouse.wheel(0, 600)
      await page.waitForTimeout(250)
    }
    await expect(page.locator('[data-scene-status="idle"]')).toHaveCount(0, {
      timeout: 15_000,
    })
    await expect(page.locator('[data-scene-status="fallback"]')).toHaveCount(0)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    const violations = await page.evaluate(
      () => (window as unknown as { cspViolations: Violation[] }).cspViolations,
    )
    for (const violation of violations) {
      problems.push(
        `violation: ${violation.violatedDirective} blocked ${violation.blockedURI} at ${violation.sourceFile}:${String(violation.lineNumber)}`,
      )
    }

    expect(problems, `${route}\n${problems.join('\n')}`).toEqual([])
  })
}
