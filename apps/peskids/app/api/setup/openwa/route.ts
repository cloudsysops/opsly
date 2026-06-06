import { NextRequest } from 'next/server';
import {
  getConfigForTenant,
  isOpenWAEnabledForTenant,
  openwaRegisterWebhook,
  openwaSetupStatus,
} from '@intcloudsysops/openwa';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

const TENANT_SLUG = 'peskids';

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  if (!isOpenWAEnabledForTenant(TENANT_SLUG)) {
    return errorJson(requestId, 'OpenWA not configured (OPENWA_PESKIDS_API_URL / OPENWA_PESKIDS_API_KEY)', 503);
  }
  try {
    const cfg = getConfigForTenant(TENANT_SLUG)!;
    const { session, qrCode } = await openwaSetupStatus(cfg);
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
  if (!isOpenWAEnabledForTenant(TENANT_SLUG)) {
    return errorJson(requestId, 'OpenWA not configured', 503);
  }
  const host = req.headers.get('host') ?? 'peskids.op-sly.com';
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  try {
    const cfg = getConfigForTenant(TENANT_SLUG)!;
    const result = await openwaRegisterWebhook({ host, proto }, cfg, TENANT_SLUG);
    return successJson(requestId, { ...result });
  } catch (err) {
    return errorJson(
      requestId,
      `Setup error: ${err instanceof Error ? err.message : String(err)}`,
      502
    );
  }
}
