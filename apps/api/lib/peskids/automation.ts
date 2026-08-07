import type { GoHighLevelLeadWebhook } from './ghl-contract';
import { buildPeskidsAutomationPayload } from './ghl-contract';
import { alertN8nFailure } from '../alerting/slack-notifier';
import { recordN8nDispatchFailure, recordN8nDispatchLatency } from '../metrics/metrics-collector';

export const PESKIDS_N8N_LEAD_INTAKE_PATH = '/peskids-lead-intake';
export const PESKIDS_N8N_SEND_APPROVED_PATH = '/peskids-send-approved';

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10_000),
      });
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        console.warn(
          `[peskids/automation] fetch attempt ${attempt}/${maxRetries} failed: ${lastError.message}. Retrying in ${Math.pow(2, attempt - 1)}s...`
        );
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }
  }

  throw lastError ?? new Error('fetch failed after retries');
}

export async function dispatchPeskidsLeadAutomation(
  payload: GoHighLevelLeadWebhook
): Promise<{ ok: true; detail: string } | { ok: false; detail: string }> {
  const base = process.env.N8N_WEBHOOK_BASE_URL?.trim().replace(/\/$/, '');
  if (!base) {
    const detail = 'N8N_WEBHOOK_BASE_URL not configured';
    await alertN8nFailure('dispatchPeskidsLeadAutomation', detail, payload.lead_id);
    return { ok: false, detail };
  }

  try {
    const startMs = Date.now();
    const response = await fetchWithRetry(`${base}${PESKIDS_N8N_LEAD_INTAKE_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPeskidsAutomationPayload(payload)),
    });

    const latencyMs = Date.now() - startMs;
    await recordN8nDispatchLatency('peskids', latencyMs);

    if (!response.ok) {
      const detail = `n8n returned ${response.status}`;
      await recordN8nDispatchFailure('peskids', detail);
      await alertN8nFailure('dispatchPeskidsLeadAutomation', detail, payload.lead_id);
      return { ok: false, detail };
    }

    return { ok: true, detail: 'queued in n8n' };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    await recordN8nDispatchFailure('peskids', detail);
    await alertN8nFailure('dispatchPeskidsLeadAutomation', detail, payload.lead_id);
    return { ok: false, detail };
  }
}
