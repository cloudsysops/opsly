import { NextResponse } from 'next/server';

import { runFlushBillingUsage } from '../../../../lib/billing/flush-billing-usage';

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const auth = request.headers.get('authorization');
  const bearer =
    auth !== null && auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : null;
  const header = request.headers.get('x-cron-secret');
  const token = bearer ?? header ?? '';
  return token === secret;
}

/**
 * Cron / job scheduler: GET o POST con `Authorization: Bearer <CRON_SECRET>` o `x-cron-secret`.
 */
export async function GET(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runFlushBillingUsage();
  return NextResponse.json(result);
}

export async function POST(request: Request): Promise<Response> {
  return GET(request);
}
