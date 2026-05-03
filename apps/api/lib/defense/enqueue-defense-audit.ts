import { randomUUID } from 'node:crypto';

const ORCHESTRATOR_INTERNAL_URL =
  process.env.ORCHESTRATOR_INTERNAL_URL?.trim() ?? 'http://127.0.0.1:3011';

export type TenantPlanForDefense = 'startup' | 'business' | 'enterprise' | 'demo';

export interface EnqueueDefenseAuditInput {
  auditId: string;
  tenantId: string;
  tenantSlug: string;
  auditType: string;
  framework?: string;
  scope?: string[];
  plan?: TenantPlanForDefense;
}

/**
 * Encola job `defense_audit` en el orchestrator (mismo patrón que ollama-demo).
 * Falla en silencio si falta token o el servicio no responde; el audit queda `scheduled`.
 */
export async function tryEnqueueDefenseAuditJob(input: EnqueueDefenseAuditInput): Promise<{
  ok: boolean;
  status: number;
  detail: string;
}> {
  const token = process.env.PLATFORM_ADMIN_TOKEN?.trim() ?? '';
  if (token.length === 0) {
    return { ok: false, status: 0, detail: 'PLATFORM_ADMIN_TOKEN not set' };
  }

  const requestId = randomUUID();
  const body = {
    audit_id: input.auditId,
    tenant_id: input.tenantId,
    tenant_slug: input.tenantSlug,
    audit_type: input.auditType,
    framework: input.framework,
    scope: input.scope,
    plan: input.plan,
    request_id: requestId,
  };

  try {
    const res = await fetch(
      `${ORCHESTRATOR_INTERNAL_URL.replace(/\/$/, '')}/internal/enqueue-defense-audit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      }
    );
    const text = await res.text();
    return { ok: res.ok, status: res.status, detail: text.slice(0, 500) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, detail: msg };
  }
}
