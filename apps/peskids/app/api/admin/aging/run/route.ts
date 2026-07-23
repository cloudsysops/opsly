import { type NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { runLeadAgingScan } from '@/lib/services/lead-aging.service';

export const dynamic = 'force-dynamic';

function readCronSecrets(): string[] {
  const candidates = [
    process.env.PESKIDS_AGING_CRON_SECRET,
    process.env.PESKIDS_FOLLOWUP_CRON_SECRET,
    process.env.PESKIDS_DIGEST_CRON_SECRET,
    process.env.CRON_SECRET,
  ];
  const secrets: string[] = [];
  for (const raw of candidates) {
    const value = raw?.trim() ?? '';
    if (value && !secrets.includes(value)) {
      secrets.push(value);
    }
  }
  return secrets;
}

function isCronAuthorized(req: NextRequest): boolean {
  const secrets = readCronSecrets();
  if (secrets.length === 0) return false;

  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const headerToken = req.headers.get('x-cron-secret')?.trim() ?? '';

  return secrets.includes(bearer) || secrets.includes(headerToken);
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);

  const cronOk = isCronAuthorized(req);
  if (!cronOk) {
    const auth = await validateStaffRequest(req);
    if (!auth.ok) {
      return errorJson(requestId, auth.error, auth.status);
    }
  }

  try {
    const result = await runLeadAgingScan();
    return successJson(requestId, { ok: true, ...result });
  } catch (error) {
    console.error('[admin/aging/run]', error, { request_id: requestId });
    return errorJson(requestId, 'Failed to run aging scan', 500);
  }
}
