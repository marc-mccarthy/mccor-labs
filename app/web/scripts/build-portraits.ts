import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const SOURCE_DIR = '/Users/mj/Downloads/mccor-labs-images/website-images'
const OUT_DIR = join(import.meta.dirname, '..', 'public', 'media', 'team')

const ACCENT_ORANGE = { r: 255, g: 122, b: 0 }

const JOBS: readonly {
  slug: string
  width: number
  height: number
  duotone: boolean
}[] = [
  { slug: 'marcm', width: 400, height: 500, duotone: false },
  { slug: 'nateb', width: 320, height: 400, duotone: true },
  { slug: 'ashleyt', width: 320, height: 400, duotone: false },
  { slug: 'mariem', width: 320, height: 400, duotone: false },
]

async function buildPortrait(job: (typeof JOBS)[number]): Promise<void> {
  const source = join(SOURCE_DIR, `${job.slug}-profile-pic.jpg`)
  let pipeline = sharp(source).resize(job.width, job.height, {
    fit: 'cover',
    position: sharp.strategy.attention,
  })

  if (job.duotone) {
    pipeline = pipeline.modulate({ saturation: 0 }).tint(ACCENT_ORANGE)
  }

  await pipeline
    .clone()
    .avif({ quality: 55 })
    .toFile(join(OUT_DIR, `${job.slug}.avif`))
  await pipeline
    .clone()
    .webp({ quality: 72 })
    .toFile(join(OUT_DIR, `${job.slug}.webp`))
}

function assertSourcesExist(): void {
  const missing = JOBS.map((job) =>
    join(SOURCE_DIR, `${job.slug}-profile-pic.jpg`),
  ).filter((source) => !existsSync(source))
  if (missing.length > 0) {
    throw new Error(`Missing source photo(s), refusing to run:\n${missing.join('\n')}`)
  }
}

async function main(): Promise<void> {
  assertSourcesExist()
  mkdirSync(OUT_DIR, { recursive: true })
  for (const job of JOBS) {
    await buildPortrait(job)
  }
}

await main()
