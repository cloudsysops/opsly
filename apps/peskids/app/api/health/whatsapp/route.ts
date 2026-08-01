import { NextResponse } from 'next/server';
import {
  assessWhatsAppReadiness,
  resolveMetaCloudForTenant,
} from '@intcloudsysops/whatsapp-channel';
import { resolveWacrmForTenant } from '@intcloudsysops/wacrm-channel';

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

/**
 * WhatsApp channel readiness.
 * Distinguishes stub/proxy from real Meta transport. Never reports ready for Nginx-only WACRM.
 */
export async function GET(): Promise<NextResponse> {
  const slug = tenantSlug();
  const meta = resolveMetaCloudForTenant(slug);
  const readiness = assessWhatsAppReadiness(meta);
  const wacrm = resolveWacrmForTenant(slug);

  let wacrmState = 'stub';
  if (!wacrm || !wacrm.enabled) {
    wacrmState = 'disabled';
  } else if (wacrm.serverUrl.includes('wacrm') || wacrm.serverUrl.length > 0) {
    wacrmState = 'configured_optional';
  }

  const httpStatus =
    readiness.lifecycle === 'stub' && meta.enabled ? 503 : 200;

  return NextResponse.json(
    {
      status: readiness.lifecycle,
      transport_real: readiness.transportReal,
      provider: readiness.provider,
      inbound_accepting: readiness.inboundAccepting,
      outbound_allowed: readiness.outboundAllowed,
      reasons: readiness.reasons,
      wacrm: {
        state: wacrmState,
        enabled: wacrm?.enabled === true,
        note: 'WACRM is optional; health proxy alone is not WhatsApp transport',
      },
      flags: {
        PESKIDS_WHATSAPP_ENABLED: meta.enabled,
        PESKIDS_WHATSAPP_INBOUND_META: meta.inboundEnabled,
        PESKIDS_WHATSAPP_OUTBOUND_ENABLED: meta.outboundEnabled,
      },
      sandbox: true,
    },
    { status: httpStatus }
  );
}
