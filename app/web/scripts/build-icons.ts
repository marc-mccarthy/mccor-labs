import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const PUBLIC_DIR = join(import.meta.dirname, '..', 'public')
const SOURCE = join(PUBLIC_DIR, 'icon.svg')

const RENDER_DENSITY = 768
const APPLE_SIZE = 180
const ICO_SIZES = [32, 16] as const

const ICONDIR_BYTES = 6
const ICONDIRENTRY_BYTES = 16
const ICO_TYPE_ICON = 1
const ICO_PLANES = 1
const ICO_BIT_DEPTH = 32

async function render(svg: Buffer, size: number): Promise<Buffer> {
  return sharp(svg, { density: RENDER_DENSITY })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer()
}

function packIco(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(ICONDIR_BYTES)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(ICO_TYPE_ICON, 2)
  header.writeUInt16LE(images.length, 4)

  let offset = ICONDIR_BYTES + ICONDIRENTRY_BYTES * images.length
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(ICONDIRENTRY_BYTES)
    entry.writeUInt8(size, 0)
    entry.writeUInt8(size, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(ICO_PLANES, 4)
    entry.writeUInt16LE(ICO_BIT_DEPTH, 6)
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  })

  return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)])
}

async function main(): Promise<void> {
  const svg = readFileSync(SOURCE)

  writeFileSync(join(PUBLIC_DIR, 'apple-touch-icon.png'), await render(svg, APPLE_SIZE))

  const images = await Promise.all(
    ICO_SIZES.map(async (size) => ({ size, png: await render(svg, size) })),
  )
  writeFileSync(join(PUBLIC_DIR, 'favicon.ico'), packIco(images))
}

await main()
