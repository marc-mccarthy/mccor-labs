export function logEvent(fields: Record<string, string | number | boolean | null>): void {
  process.stdout.write(`${JSON.stringify(fields)}\n`)
}
