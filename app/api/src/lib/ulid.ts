const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function defaultRandom(bytes: Uint8Array): Uint8Array {
  return crypto.getRandomValues(bytes)
}

export function ulid(
  now: Date,
  random: (bytes: Uint8Array) => Uint8Array = defaultRandom,
): string {
  let time = now.getTime()
  if (!Number.isSafeInteger(time) || time < 0) {
    throw new Error('ulid needs a valid, non-negative time')
  }
  const timeChars: string[] = []
  for (let i = 0; i < 10; i += 1) {
    timeChars.unshift(ALPHABET.charAt(time % 32))
    time = Math.floor(time / 32)
  }
  const randomChars = Array.from(random(new Uint8Array(16)), (byte) =>
    ALPHABET.charAt(byte & 31),
  )
  return timeChars.join('') + randomChars.join('')
}
