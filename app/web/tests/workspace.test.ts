import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('workspace wiring', () => {
  it('names the site package "web" so pnpm -F web resolves', () => {
    const pkg = JSON.parse(
      readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8'),
    ) as { name: string }
    expect(pkg.name).toBe('web')
  })

  it('configures static export with trailing slashes', () => {
    const config = readFileSync(join(import.meta.dirname, '..', 'next.config.ts'), 'utf8')
    expect(config).toMatch(/output:\s*'export'/)
    expect(config).toMatch(/trailingSlash:\s*true/)
    expect(config).toMatch(/unoptimized:\s*true/)
  })
})
