export interface LambdaFunctionURLEvent {
  body?: string
  isBase64Encoded: boolean
  requestContext: { http: { method: string } }
}

export interface LambdaFunctionURLResult {
  statusCode: number
  headers: Record<string, string>
  body: string
}

export function json(status: number, body: unknown): LambdaFunctionURLResult {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify(body),
  }
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function parseJsonBody<T>(
  event: LambdaFunctionURLEvent,
  maxBytes: number,
): T | null {
  if (event.body === undefined || event.body === '') return null
  const raw = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8')
  if (raw.byteLength > maxBytes) return null
  try {
    return JSON.parse(raw.toString('utf8')) as T
  } catch {
    return null
  }
}
