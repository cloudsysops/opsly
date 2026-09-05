import { NextResponse } from 'next/server'

/**
 * Structured error codes for Peskids API responses.
 *
 * Clients switch on `code`; `error` stays a short human-readable string. Neither
 * ever carries a stack trace, SQL text, connection string, token or file path —
 * `sanitizeErrorMessage()` below is the single place that decides what may
 * cross the wire, and `errorJson()` runs it on every response.
 */
export const API_ERROR_CODES = [
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'MODULE_DISABLED',
  'MODULE_MOVED',
  'UPSTREAM_ERROR',
  'NOT_CONFIGURED',
  'INTERNAL_ERROR',
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  410: 'MODULE_MOVED',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  502: 'UPSTREAM_ERROR',
  503: 'NOT_CONFIGURED',
}

export function codeForStatus(status: number): ApiErrorCode {
  return STATUS_TO_CODE[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST')
}

/** Patterns that must never appear in a response body. */
const LEAKY_PATTERNS: RegExp[] = [
  /postgres(?:ql)?:\/\/\S+/gi, // DB connection strings
  /https?:\/\/[^\s'"]*supabase\.[a-z]+\S*/gi, // Supabase project URLs
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g, // JWTs
  /\bsk_(?:live|test)_[A-Za-z0-9]+/g, // Stripe secret keys
  /\b(?:whsec|rk_live|rk_test)_[A-Za-z0-9]+/g, // Stripe webhook/restricted keys
  /(?:\/(?:home|var|usr|opt|app|root)\/[^\s'"]+)/g, // absolute file paths
  /\bat\s+\S+\s+\([^)]*:\d+:\d+\)/g, // stack frames
]

/** Fragments that indicate a raw driver/SQL error escaped into the message. */
const DB_ERROR_HINTS =
  /(duplicate key value|violates (?:foreign key|unique|not-null|check) constraint|syntax error at or near|relation "|column "|PGRST\d+|permission denied for (?:table|schema)|SQLSTATE)/i

/**
 * Returns a message that is safe to send to a client. Anything that looks like
 * a database error, a stack trace or a credential collapses to a generic string.
 */
export function sanitizeErrorMessage(message: string, fallback = 'Request failed'): string {
  const trimmed = (message ?? '').trim()
  if (trimmed.length === 0) return fallback
  if (DB_ERROR_HINTS.test(trimmed)) return fallback
  if (trimmed.includes('\n')) return fallback

  let cleaned = trimmed
  for (const pattern of LEAKY_PATTERNS) {
    if (pattern.test(cleaned)) return fallback
    pattern.lastIndex = 0
  }

  // Long messages are almost always framework output rather than something a
  // user can act on.
  if (cleaned.length > 200) cleaned = fallback
  return cleaned
}

export function resolveRequestId(request: { headers?: Headers | null }): string {
  return request.headers?.get('x-request-id') ?? crypto.randomUUID()
}

export function errorJson(
  requestId: string,
  error: string,
  status: number,
  code: ApiErrorCode = codeForStatus(status)
) {
  return NextResponse.json(
    { ok: false, error: sanitizeErrorMessage(error, 'Request failed'), code, request_id: requestId },
    { status }
  )
}

export function successJson<T extends Record<string, unknown>>(
  requestId: string,
  payload: T,
  status = 200
) {
  return NextResponse.json({ ...payload, request_id: requestId }, { status })
}

/**
 * Logs the real error server-side (with the request id so it can be correlated)
 * and returns a sanitized response. Use this instead of hand-rolling a catch
 * block that echoes `err.message`.
 */
export function internalErrorJson(
  requestId: string,
  scope: string,
  error: unknown,
  clientMessage = 'Internal server error',
  status = 500
) {
  console.error(
    JSON.stringify({
      component: 'peskids.api',
      event: 'request_failed',
      scope,
      status,
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
    })
  )
  return errorJson(requestId, clientMessage, status)
}
