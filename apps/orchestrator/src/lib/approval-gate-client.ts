import type { ApprovalGateRequest, ApprovalGateResponse } from '@intcloudsysops/types';

const DEFAULT_TIMEOUT_MS = 30_000;

function gatewayBaseUrl(): string {
  const raw =
    process.env.LLM_GATEWAY_URL ??
    process.env.ORCHESTRATOR_LLM_GATEWAY_URL ??
    'http://127.0.0.1:3010';
  return raw.replace(/\/$/, '');
}

export class ApprovalGateClient {
  private readonly endpoint: string;

  private readonly timeoutMs: number;

  public constructor(endpoint?: string, timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.endpoint = (endpoint ?? gatewayBaseUrl()).replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
  }

  public async analyze(request: ApprovalGateRequest): Promise<ApprovalGateResponse> {
    const url = `${this.endpoint}/v1/approval-analyze`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      const text = await res.text();
      let body: unknown;
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        throw new Error(`approval-analyze: invalid JSON (${res.status})`);
      }
      if (!res.ok) {
        const errObj = body as { error?: string; message?: string };
        const msg = errObj.message ?? errObj.error ?? text;
        throw new Error(`approval-analyze HTTP ${res.status}: ${msg}`);
      }
      return body as ApprovalGateResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
