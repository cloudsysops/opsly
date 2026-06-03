import type { GoHighLevelLeadWebhook } from './ghl-contract';
import { buildPeskidsAutomationPayload } from './ghl-contract';

export const PESKIDS_N8N_LEAD_INTAKE_PATH = '/peskids-lead-intake';

async function fetchWithRetry(
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
    return { ok: false, detail: 'N8N_WEBHOOK_BASE_URL not configured' };
  }

  try {
    const response = await fetchWithRetry(
      `${base}${PESKIDS_N8N_LEAD_INTAKE_PATH}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPeskidsAutomationPayload(payload)),
      }
    );

    if (!response.ok) {
      return { ok: false, detail: `n8n returned ${response.status}` };
    }

    return { ok: true, detail: 'queued in n8n' };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, detail };
  }
}
