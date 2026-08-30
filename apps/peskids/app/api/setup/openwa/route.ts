import { NextRequest } from 'next/server';
import { isOpenWAEnabled, openwaRegisterWebhook, openwaSetupStatus } from '@intcloudsysops/openwa';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  if (!isOpenWAEnabled()) {
    return errorJson(requestId, 'OpenWA not configured (OPENWA_API_URL / OPENWA_API_KEY)', 503);
  }
  try {
    const { session, qrCode } = await openwaSetupStatus();
    return successJson(requestId, { session, qrCode });
  } catch (err) {
    return errorJson(
      requestId,
      `OpenWA error: ${err instanceof Error ? err.message : String(err)}`,
      502
    );
  }
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  if (!isOpenWAEnabled()) {
    return errorJson(requestId, 'OpenWA not configured', 503);
  }
  const host = req.headers.get('host') ?? 'www.peskids.com';
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  try {
    const result = await openwaRegisterWebhook({ host, proto }, undefined, 'peskids');
    return successJson(requestId, { ...result });
  } catch (err) {
    return errorJson(
      requestId,
      `Setup error: ${err instanceof Error ? err.message : String(err)}`,
      502
    );
  }
}
