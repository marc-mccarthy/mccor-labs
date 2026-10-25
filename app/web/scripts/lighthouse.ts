import { execFile, spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)

const PORT = 4323
const ORIGIN = `http://localhost:${String(PORT)}`
const OUT_DIR = 'lighthouse-report'
const GATE = 95
const RUNS = 3
const PERF_TARGET = { desktop: 90, mobile: 85 } as const
const ROUTES = [
  '/',
  '/services/',
  '/work/',
  '/about/',
  '/process/',
  '/contact/',
  '/careers/',
  '/privacy/',
  '/terms/',
]
const GATED = ['accessibility', 'best-practices', 'seo'] as const
const CATEGORIES = [...GATED, 'performance'] as const
const FORM_FACTORS = ['mobile', 'desktop'] as const

type FormFactor = (typeof FORM_FACTORS)[number]
type Category = (typeof GATED)[number] | 'performance'

interface Result {
  route: string
  formFactor: FormFactor
  scores: Record<Category, number>
  tbt: number
  lcp: number
}

interface LighthouseJson {
  categories: Record<Category, { score: number | null }>
  audits: Record<
    'total-blocking-time' | 'largest-contentful-paint',
    { numericValue?: number }
  >
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const centre = sorted.slice(
    Math.floor((sorted.length - 1) / 2),
    Math.floor(sorted.length / 2) + 1,
  )
  return centre.reduce((sum, value) => sum + value, 0) / centre.length
}

function startServer() {
  return spawn('../../node_modules/.bin/serve', ['out', '--listen', String(PORT)], {
    stdio: 'ignore',
  })
}

async function lighthouse(
  route: string,
  formFactor: FormFactor,
  attempt: number,
): Promise<LighthouseJson> {
  const file = join(
    OUT_DIR,
    `${formFactor}${route.replaceAll('/', '_')}.run${String(attempt)}.json`,
  )
  const args = [
    'exec',
    'lighthouse',
    ORIGIN + route,
    '--quiet',
    '--output=json',
    `--output-path=${file}`,
    '--chrome-flags=--headless=new',
    `--only-categories=${CATEGORIES.join(',')}`,
  ]
  if (formFactor === 'desktop') args.push('--preset=desktop')
  await run('pnpm', args)
  return JSON.parse(await readFile(file, 'utf8')) as LighthouseJson
}

function medianScores(jsons: LighthouseJson[]): Record<Category, number> {
  return Object.fromEntries(
    CATEGORIES.map((name) => [
      name,
      median(jsons.map((json) => Math.round((json.categories[name].score ?? 0) * 100))),
    ]),
  ) as Record<Category, number>
}

function medianAudit(
  jsons: LighthouseJson[],
  id: keyof LighthouseJson['audits'],
): number {
  return Math.round(median(jsons.map((json) => json.audits[id].numericValue ?? 0)))
}

async function audit(route: string, formFactor: FormFactor): Promise<Result> {
  const jsons: LighthouseJson[] = []
  for (let index = 1; index <= RUNS; index++) {
    jsons.push(await lighthouse(route, formFactor, index))
  }
  return {
    route,
    formFactor,
    scores: medianScores(jsons),
    tbt: medianAudit(jsons, 'total-blocking-time'),
    lcp: medianAudit(jsons, 'largest-contentful-paint'),
  }
}

function failures(results: Result[]): string[] {
  return results.flatMap((result) =>
    GATED.filter((category) => result.scores[category] < GATE).map(
      (category) =>
        `${result.formFactor} ${result.route} ${category} ${String(result.scores[category])} < ${String(GATE)}`,
    ),
  )
}

function summarise(results: Result[], failed: string[]): string {
  const rows = results.map(
    ({ route, formFactor, scores, tbt, lcp }) =>
      `| ${formFactor} | ${route} | ${String(scores.accessibility)} | ${String(scores['best-practices'])} | ${String(scores.seo)} | ${String(scores.performance)} (target ${String(PERF_TARGET[formFactor])}) | ${String(tbt)} | ${String(lcp)} |`,
  )
  return [
    '# Lighthouse summary',
    '',
    `Median of ${String(RUNS)} runs. Gate: accessibility, best-practices and seo must each be at least ${String(GATE)}. Performance is reported only.`,
    '',
    '| Form factor | Route | Accessibility | Best practices | SEO | Performance | TBT (ms) | LCP (ms) |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
    failed.length === 0
      ? 'Result: PASS'
      : `Result: FAIL\n\n${failed.map((line) => `- ${line}`).join('\n')}`,
    '',
  ].join('\n')
}

function selectedRoutes(argument: string | undefined): string[] {
  return argument === undefined ? ROUTES : [argument]
}

async function main(): Promise<void> {
  const routes = selectedRoutes(process.argv[2])
  await mkdir(OUT_DIR, { recursive: true })
  const server = startServer()
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const results: Result[] = []
    for (const formFactor of FORM_FACTORS) {
      for (const route of routes) results.push(await audit(route, formFactor))
    }
    const failed = failures(results)
    const summary = summarise(results, failed)
    await writeFile(join(OUT_DIR, 'summary.md'), summary)
    process.stdout.write(summary)
    if (failed.length > 0) process.exitCode = 1
  } finally {
    server.kill()
  }
}

function report(error: unknown): void {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(report)
