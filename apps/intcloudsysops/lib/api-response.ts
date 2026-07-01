import { NextResponse } from 'next/server'

export function resolveRequestId(request: { headers?: Headers | null }): string {
  return request.headers?.get('x-request-id') ?? crypto.randomUUID()
}

export function errorJson(requestId: string, error: string, status: number) {
  return NextResponse.json({ ok: false, error, request_id: requestId }, { status })
}

export function successJson<T extends Record<string, unknown>>(
  requestId: string,
  payload: T,
  status = 200
) {
  return NextResponse.json({ ...payload, request_id: requestId }, { status })
}
