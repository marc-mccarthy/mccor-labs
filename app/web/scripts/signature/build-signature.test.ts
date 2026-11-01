import { describe, expect, it } from 'vitest'
import { cropRegion, parseCrop } from './build-signature'

const box = { width: 76, height: 100 }
const source = { width: 3392, height: 5056 }

describe('parseCrop', () => {
  it('reads whole-number centre, top and height', () => {
    expect(parseCrop('{"centerX":1685,"top":1580,"height":1950}', 'marcm.json')).toEqual({
      centerX: 1685,
      top: 1580,
      height: 1950,
    })
  })

  it.each([
    ['{"top":1,"height":1}', '"centerX"'],
    ['{"centerX":1,"top":1.5,"height":1}', '"top"'],
    ['{"centerX":1,"top":-1,"height":1}', '"top"'],
    ['{"centerX":1,"top":1,"height":0}', '"height"'],
    ['{"centerX":"1","top":1,"height":1}', '"centerX"'],
  ])('rejects %s and names the file and key', (json, key) => {
    expect(() => parseCrop(json, 'photos/marcm.json')).toThrow(
      `photos/marcm.json needs a whole number ${key}`,
    )
  })
})

describe('cropRegion', () => {
  it('derives the width from the photo box and centres it', () => {
    expect(
      cropRegion({ centerX: 1685, top: 1580, height: 1950 }, box, source, 'm'),
    ).toEqual({
      left: 944,
      top: 1580,
      width: 1482,
      height: 1950,
    })
  })

  it.each([
    [{ centerX: 100, top: 0, height: 1000 }, 'left edge'],
    [{ centerX: 3300, top: 0, height: 1000 }, 'right edge'],
    [{ centerX: 1700, top: 4000, height: 1100 }, 'bottom edge'],
  ])('rejects a crop past the %s', (crop) => {
    expect(() => cropRegion(crop, box, source, 'photos/marcm.json')).toThrow(
      'photos/marcm.json crops',
    )
  })
})
