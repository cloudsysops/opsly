import type { GoHighLevelLeadWebhook } from './ghl-contract';
import { buildPeskidsAutomationPayload } from './ghl-contract';

export const PESKIDS_N8N_LEAD_INTAKE_PATH = '/peskids-lead-intake';

export async function dispatchPeskidsLeadAutomation(
  payload: GoHighLevelLeadWebhook
): Promise<{ ok: true; detail: string } | { ok: false; detail: string }> {
  const base = process.env.N8N_WEBHOOK_BASE_URL?.trim().replace(/\/$/, '');
  if (!base) {
    return { ok: false, detail: 'N8N_WEBHOOK_BASE_URL not configured' };
  }

  try {
    const response = await fetch(`${base}${PESKIDS_N8N_LEAD_INTAKE_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPeskidsAutomationPayload(payload)),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return { ok: false, detail: `n8n returned ${response.status}` };
    }

    return { ok: true, detail: 'queued in n8n' };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, detail };
  }
}
