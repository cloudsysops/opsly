import type { PeskidsLeadRow } from './repository';
import { isPeskidsHotLeadAlertsEnabled } from './feature-flags';

export const PESKIDS_N8N_SUPPORT_NOTIFY_PATH = '/peskids-notify';

export type SupportWhatsAppAlertResult = {
  ok: boolean;
  status: 'sent' | 'skipped' | 'failed';
  detail: string;
  delivery_id: string;
};

function supportPhone(): string {
  return process.env.PESKIDS_SUPPORT_WHATSAPP?.trim() ?? '';
}

function adminLeadUrl(leadId: string): string {
  const base =
    process.env.PESKIDS_APP_URL?.trim().replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_PESKIDS_URL?.trim().replace(/\/$/, '') ||
    'https://peskids.op-sly.com';
  return `${base}/admin/interesados/${encodeURIComponent(leadId)}`;
}

function buildBody(row: PeskidsLeadRow): string {
  return [
    `Nombre: ${row.full_name}`,
    `Correo: ${row.email}`,
    `Teléfono: ${row.phone || 'No indicado'}`,
    `Niño/a: ${row.child_name || 'No indicado'}`,
    `Nacimiento: ${row.birth_date || 'No indicado'}`,
    `Modalidad: ${row.class_modality || 'No indicada'}`,
    `Barrio/zona: ${row.neighborhood || 'No indicada'}`,
    `Fuente: ${row.referral_source || 'web'}`,
    `Ficha del lead: ${adminLeadUrl(row.id)}`,
    'La cédula se consulta en la ficha protegida; no se envía por WhatsApp.',
  ].join('\n');
}

/**
 * Sends a support-only WhatsApp alert through the existing Peskids n8n notify flow.
 * It is flag-gated and fail-open for lead persistence: notification failure never
 * changes the successful lead response.
 */
export async function dispatchPeskidsSupportWhatsAppAlert(
  row: PeskidsLeadRow
): Promise<SupportWhatsAppAlertResult> {
  const deliveryId = `support-whatsapp:lead.created:${row.id}`;
  if (!isPeskidsHotLeadAlertsEnabled()) {
    return {
      ok: true,
      status: 'skipped',
      detail: 'PESKIDS_HOT_LEAD_ALERTS_ENABLED=false',
      delivery_id: deliveryId,
    };
  }

  const to = supportPhone();
  if (!to) {
    return {
      ok: false,
      status: 'failed',
      detail: 'PESKIDS_SUPPORT_WHATSAPP not configured',
      delivery_id: deliveryId,
    };
  }

  const base = process.env.N8N_WEBHOOK_BASE_URL?.trim().replace(/\/$/, '');
  if (!base) {
    return {
      ok: false,
      status: 'failed',
      detail: 'N8N_WEBHOOK_BASE_URL not configured',
      delivery_id: deliveryId,
    };
  }

  try {
    const response = await fetch(`${base}${PESKIDS_N8N_SUPPORT_NOTIFY_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'lead_created_support',
        tenant_id: row.tenant_slug,
        to,
        title: `Nuevo lead Peskids: ${row.full_name}`,
        body: buildBody(row),
        metadata: {
          delivery_id: deliveryId,
          lead_id: row.id,
          event_type: 'lead.created',
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return {
        ok: false,
        status: 'failed',
        detail: `n8n returned ${response.status}`,
        delivery_id: deliveryId,
      };
    }
    return { ok: true, status: 'sent', detail: 'queued in n8n', delivery_id: deliveryId };
  } catch (error) {
    return {
      ok: false,
      status: 'failed',
      detail: error instanceof Error ? error.message : String(error),
      delivery_id: deliveryId,
    };
  }
}
