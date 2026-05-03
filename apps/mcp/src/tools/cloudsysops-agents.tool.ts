import { z } from 'zod';
import { HTTP_TIMEOUT_MS } from '../lib/constants.js';
import type { ToolDefinition } from '../types/index.js';

function orchestratorBaseUrl(): string | null {
  const u = process.env.MCP_ORCHESTRATOR_URL ?? process.env.ORCHESTRATOR_INTERNAL_URL;
  return u?.trim() ? u.replace(/\/$/, '') : null;
}

async function postOrchestratorJson(
  path: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; job_id?: string; error?: string }> {
  const base = orchestratorBaseUrl();
  const token = process.env.PLATFORM_ADMIN_TOKEN?.trim();
  if (!base) {
    return { ok: false, error: 'Missing MCP_ORCHESTRATOR_URL or ORCHESTRATOR_INTERNAL_URL' };
  }
  if (!token) {
    return { ok: false, error: 'Missing PLATFORM_ADMIN_TOKEN for orchestrator internal enqueue' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, error: `HTTP ${String(res.status)}: ${text.slice(0, 240)}` };
    }
    const parsed = JSON.parse(text) as { job_id?: string };
    return { ok: true, job_id: parsed.job_id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

const salesInputSchema = z.object({
  tenant_slug: z.string().min(3),
  message: z.string().min(1),
  customer_id: z.string().min(1),
  tenant_id: z.string().min(1),
  conversation_history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional(),
  context_block: z.string().optional(),
  plan: z.enum(['startup', 'business', 'enterprise']).optional(),
  request_id: z.string().optional(),
});

type SalesInput = z.infer<typeof salesInputSchema>;

type EnqueueResult = { ok: boolean; job_id?: string; error?: string };

async function runEnqueueSales(input: SalesInput): Promise<EnqueueResult> {
  return postOrchestratorJson('/internal/enqueue-cloudsysops-sales', {
    tenant_slug: input.tenant_slug,
    message: input.message,
    customer_id: input.customer_id,
    tenant_id: input.tenant_id,
    conversation_history: input.conversation_history ?? [],
    ...(input.context_block !== undefined ? { context_block: input.context_block } : {}),
    ...(input.plan !== undefined ? { plan: input.plan } : {}),
    ...(input.request_id !== undefined ? { request_id: input.request_id } : {}),
  });
}

const opsInputSchema = z.object({
  tenant_slug: z.string().min(3),
  booking_id: z.string().min(1),
  tenant_id: z.string().min(1),
  service_type: z.string().min(1),
  findings: z.string().min(1),
  actions_performed: z.string().min(1),
  metrics_before_after: z.object({
    before: z.record(z.unknown()),
    after: z.record(z.unknown()),
  }),
  customer_satisfaction: z.number().int().min(1).max(5),
  plan: z.enum(['startup', 'business', 'enterprise']).optional(),
  request_id: z.string().optional(),
});

type OpsInput = z.infer<typeof opsInputSchema>;

async function runEnqueueOps(input: OpsInput): Promise<EnqueueResult> {
  return postOrchestratorJson('/internal/enqueue-cloudsysops-ops', {
    tenant_slug: input.tenant_slug,
    booking_id: input.booking_id,
    tenant_id: input.tenant_id,
    service_type: input.service_type,
    findings: input.findings,
    actions_performed: input.actions_performed,
    metrics_before_after: input.metrics_before_after,
    customer_satisfaction: input.customer_satisfaction,
    ...(input.plan !== undefined ? { plan: input.plan } : {}),
    ...(input.request_id !== undefined ? { request_id: input.request_id } : {}),
  });
}

export const enqueueCloudSysOpsSalesMessageTool: ToolDefinition<SalesInput, EnqueueResult> = {
  name: 'enqueue_cloudsysops_sales_message',
  description:
    'Encola un job `cloudsysops_sales_message` en el orchestrator (cola cloudsysops-agents). Requiere worker con OPSLY_CLOUDSYSOPS_AGENTS_WORKER_ENABLED y LLM Gateway.',
  inputSchema: salesInputSchema,
  handler: runEnqueueSales,
};

export const enqueueCloudSysOpsOpsCompleteTool: ToolDefinition<OpsInput, EnqueueResult> = {
  name: 'enqueue_cloudsysops_ops_complete',
  description:
    'Encola un job `cloudsysops_ops_complete` para generar informe post-servicio vía LLM Gateway (cola cloudsysops-agents).',
  inputSchema: opsInputSchema,
  handler: runEnqueueOps,
};
