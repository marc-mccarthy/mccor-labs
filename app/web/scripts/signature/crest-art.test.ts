import { describe, expect, it } from 'vitest'
import { dropSpecks, silhouette } from './crest-art'

function image(width: number, height: number, opaque: [number, number][]): Uint8Array {
  const rgba = new Uint8Array(width * height * 4)
  for (const [x, y] of opaque) rgba.set([200, 100, 50, 255], (y * width + x) * 4)
  return rgba
}

const alphaAt = (rgba: Uint8Array, width: number, x: number, y: number) =>
  rgba[(y * width + x) * 4 + 3]

describe('dropSpecks', () => {
  const block = [0, 1, 2].flatMap((y) => [0, 1, 2].map((x) => [x, y] as [number, number]))

  it('clears detached islands at or under the size limit', () => {
    const out = dropSpecks(image(8, 8, [...block, [6, 6]]), 8, 8, 2)
    expect(alphaAt(out, 8, 6, 6)).toBe(0)
  })

  it('keeps islands above the limit, such as letter counters', () => {
    const out = dropSpecks(image(8, 8, [...block, [6, 6]]), 8, 8, 2)
    expect(alphaAt(out, 8, 1, 1)).toBe(255)
  })

  it('treats diagonal neighbours as connected', () => {
    const out = dropSpecks(
      image(4, 4, [
        [0, 0],
        [1, 1],
        [2, 2],
      ]),
      4,
      4,
      2,
    )
    expect(alphaAt(out, 4, 1, 1)).toBe(255)
  })

  it('does not change the input buffer', () => {
    const input = image(4, 4, [[3, 3]])
    dropSpecks(input, 4, 4, 2)
    expect(alphaAt(input, 4, 3, 3)).toBe(255)
  })
})

describe('silhouette', () => {
  it('fills the shape with one colour at a fraction of its alpha', () => {
    const out = silhouette(image(2, 1, [[0, 0]]), '#08080a', 0.2)
    expect([...out.slice(0, 4)]).toEqual([8, 8, 10, 51])
    expect(out[7]).toBe(0)
  })
})
