const NATIONAL_LENGTH = 10

const NANP = /^[2-9]\d{2}[2-9]\d{6}$/

function nationalDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return digits.startsWith('1') ? digits.slice(1) : digits
}

export function phoneDigits(raw: string): string {
  return nationalDigits(raw).slice(0, NATIONAL_LENGTH)
}

export function formatUsPhone(raw: string): string {
  const digits = phoneDigits(raw)
  if (digits.length <= 3) return digits
  const area = `(${digits.slice(0, 3)}) `
  if (digits.length <= 6) return `${area}${digits.slice(3)}`
  return `${area}${digits.slice(3, 6)}-${digits.slice(6)}`
}

export function isValidUsPhone(raw: string): boolean {
  return NANP.test(nationalDigits(raw))
}

export function toE164(raw: string): string {
  return `+1${phoneDigits(raw)}`
}
