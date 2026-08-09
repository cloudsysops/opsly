import { alertN8nFailure } from '../alerting/slack-notifier';
import { recordN8nDispatchFailure, recordN8nDispatchLatency } from '../metrics/metrics-collector';
import { fetchWithRetry } from './automation';
import { isPeskidsHotLeadAlertsEnabled } from './feature-flags';
import type { PeskidsLeadRow } from './repository';

/** Webhook path for event-driven hot-lead alerts (n8n). */
export const PESKIDS_N8N_HOT_LEAD_ALERT_PATH = '/peskids-hot-lead-alert';

export type HotLeadAlertDeliveryStatus = 'skipped' | 'pending' | 'sent' | 'failed';

export type HotLeadAlertResult = {
  ok: boolean;
  status: HotLeadAlertDeliveryStatus;
  detail: string;
  delivery_id: string;
};

function adminLeadUrl(): string {
  const base =
    process.env.PESKIDS_APP_URL?.trim().replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_PESKIDS_URL?.trim().replace(/\/$/, '') ||
    'https://peskids.op-sly.com';
  return `${base}/admin#interesados`;
}

function buildHotLeadPayload(row: PeskidsLeadRow): Record<string, unknown> {
  const deliveryId = `hot-lead:${row.id}`;
  return {
    event_id: deliveryId,
    event_type: 'lead.created',
    tenant_slug: row.tenant_slug,
    lead_id: row.id,
    occurred_at: row.created_at,
    delivery_id: deliveryId,
    lead: {
      parent_name: row.full_name,
      email: row.email,
      phone: row.phone,
      class_modality: row.class_modality,
      neighborhood: row.neighborhood,
      grade_interested: row.grade_interested,
      referral_source: row.referral_source,
      status: row.status,
    },
    admin_url: adminLeadUrl(),
    timezone: process.env.PESKIDS_TIMEZONE?.trim() || 'America/Bogota',
  };
}

function logDelivery(result: HotLeadAlertResult, leadId: string): void {
  console.info(
    JSON.stringify({
      component: 'peskids.hot_lead_alert',
      lead_id: leadId,
      delivery_id: result.delivery_id,
      status: result.status,
      ok: result.ok,
      detail: result.detail,
    })
  );
}

/**
 * Dispatch hot-lead alert to n8n. Never throws — caller should fire-and-forget.
 * When the feature flag is off, returns skipped without calling n8n.
 */
export async function dispatchPeskidsHotLeadAlert(
  row: PeskidsLeadRow
): Promise<HotLeadAlertResult> {
  const deliveryId = `hot-lead:${row.id}`;

  if (!isPeskidsHotLeadAlertsEnabled()) {
    const skipped: HotLeadAlertResult = {
      ok: true,
      status: 'skipped',
      detail: 'PESKIDS_HOT_LEAD_ALERTS_ENABLED=false',
      delivery_id: deliveryId,
    };
    logDelivery(skipped, row.id);
    return skipped;
  }

  const base = process.env.N8N_WEBHOOK_BASE_URL?.trim().replace(/\/$/, '');
  if (!base) {
    const failed: HotLeadAlertResult = {
      ok: false,
      status: 'failed',
      detail: 'N8N_WEBHOOK_BASE_URL not configured',
      delivery_id: deliveryId,
    };
    logDelivery(failed, row.id);
    await alertN8nFailure('dispatchPeskidsHotLeadAlert', failed.detail, row.id);
    return failed;
  }

  try {
    const startMs = Date.now();
    const response = await fetchWithRetry(`${base}${PESKIDS_N8N_HOT_LEAD_ALERT_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildHotLeadPayload(row)),
    });
    const latencyMs = Date.now() - startMs;
    await recordN8nDispatchLatency('peskids-hot-lead', latencyMs);

    if (!response.ok) {
      const detail = `n8n returned ${response.status}`;
      const failed: HotLeadAlertResult = {
        ok: false,
        status: 'failed',
        detail,
        delivery_id: deliveryId,
      };
      logDelivery(failed, row.id);
      await recordN8nDispatchFailure('peskids-hot-lead', detail);
      await alertN8nFailure('dispatchPeskidsHotLeadAlert', detail, row.id);
      return failed;
    }

    const sent: HotLeadAlertResult = {
      ok: true,
      status: 'sent',
      detail: 'queued in n8n',
      delivery_id: deliveryId,
    };
    logDelivery(sent, row.id);
    return sent;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const failed: HotLeadAlertResult = {
      ok: false,
      status: 'failed',
      detail,
      delivery_id: deliveryId,
    };
    logDelivery(failed, row.id);
    await recordN8nDispatchFailure('peskids-hot-lead', detail);
    await alertN8nFailure('dispatchPeskidsHotLeadAlert', detail, row.id);
    return failed;
  }
}
