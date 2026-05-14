import { z } from 'zod';

import type { ToolDefinition } from '../types/index.js';

const ExecuteQuantumInput = z.object({
  prompt: z.string().min(1),
  tenant_slug: z.string().min(1),
  tenant_plan: z.enum(['startup', 'business', 'enterprise']),
  request_id: z.string().optional(),
  models: z.array(z.string()).optional(),
  /** Si false, solo estimación de coste vía gateway (sin ejecutar LLM). */
  confirm_budget: z.boolean().default(false),
  budget_cap_usd: z.number().positive().optional(),
});

function gatewayBaseUrl(): string {
  const u =
    process.env.MCP_LLM_GATEWAY_URL?.trim() ||
    process.env.LLM_GATEWAY_URL?.trim() ||
    'http://127.0.0.1:3010';
  return u.replace(/\/$/, '');
}

export const executeQuantumTool: ToolDefinition<z.infer<typeof ExecuteQuantumInput>, unknown> = {
  name: 'execute_quantum',
  description:
    'Quantum ensemble vía LLM Gateway (POST /v1/quantum/ensemble). Requiere plan enterprise para ejecución completa; sin confirm_budget solo estima coste.',
  inputSchema: ExecuteQuantumInput,
  handler: async (input) => {
    const parsed = ExecuteQuantumInput.parse(input);
    if (parsed.tenant_plan !== 'enterprise') {
      return {
        ok: false,
        error: 'execute_quantum requires tenant_plan enterprise',
      };
    }

    const url = `${gatewayBaseUrl()}/v1/quantum/ensemble`;
    const body: Record<string, unknown> = {
      prompt: parsed.prompt,
      tenant_slug: parsed.tenant_slug,
      tenant_plan: parsed.tenant_plan,
      confirm_budget: parsed.confirm_budget,
      estimate_only: !parsed.confirm_budget,
    };
    if (parsed.request_id !== undefined) {
      body.request_id = parsed.request_id;
    }
    if (parsed.models !== undefined) {
      body.models = parsed.models;
    }
    if (parsed.budget_cap_usd !== undefined) {
      body.budget_cap_usd = parsed.budget_cap_usd;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      return {
        ok: false,
        error: 'gateway_non_json',
        status: res.status,
        body_preview: text.slice(0, 500),
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        gateway: json,
      };
    }

    return { ok: true, gateway: json };
  },
};
