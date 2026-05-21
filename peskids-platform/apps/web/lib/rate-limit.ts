const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(identifier: string, maxRequests: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now()
  const record = requestCounts.get(identifier)

  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count < maxRequests) {
    record.count++
    return true
  }

  return false
}

export function getClientIdentifier(headers: Headers): string {
  // Use X-Forwarded-For if behind a proxy, otherwise use user-agent as fallback
  const forwarded = headers.get('x-forwarded-for')
  const userAgent = headers.get('user-agent') || 'unknown'
  return forwarded?.split(',')[0].trim() || userAgent
}
