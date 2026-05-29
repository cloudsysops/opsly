import { NextResponse } from 'next/server';

export function resolveRequestId(req: Request): string {
  return req.headers.get('x-request-id')?.trim() || crypto.randomUUID();
}

export function successJson<T extends Record<string, unknown>>(
  requestId: string,
  data: T,
  status = 200,
): NextResponse {
  return NextResponse.json({ ok: true, request_id: requestId, ...data }, { status });
}

export function errorJson(
  requestId: string,
  message: string,
  status: number,
): NextResponse {
  return NextResponse.json({ ok: false, request_id: requestId, error: message }, { status });
}
