import { NextResponse } from 'next/server';
import { HTTP_STATUS } from '../../../../lib/constants';
import { generateInsightsForAllActiveTenants } from '../../../../lib/insights/engine';

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
 * Cron: regenera insights heurísticos por tenant (churn, forecast, anomalías).
 * `Authorization: Bearer <CRON_SECRET>` o `x-cron-secret`.
 */
export async function GET(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED });
  }
  try {
    const result = await generateInsightsForAllActiveTenants();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'generate insights failed';
    return NextResponse.json({ error: message }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }
}

export async function POST(request: Request): Promise<Response> {
  return GET(request);
}
