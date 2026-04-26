/**
 * Catálogo orientativo de costos plataforma (sin secretos).
 * Estado de aprobación en memoria del proceso (se pierde al reiniciar el contenedor).
 */
import type { LlmBudgetSummary, TenantBudgetSnapshot } from './admin-costs-types';
import { fetchTenantBudgetOverview } from './admin-costs-tenant-budgets';
import { HTTP_STATUS } from './constants';

export type CostLineStatus = 'active' | 'approved' | 'pending_approval' | 'rejected' | 'available';

export type CostLineItem = {
  name: string;
  cost: number;
  period: string;
  status: CostLineStatus;
  requires_approval?: boolean;
  requires_credit_card?: boolean;
  future_cost?: string;
  duration?: string;
  description: string;
  /** Hardware / SO del worker (solo informativo). */
  specs?: string;
};

export type CostAlert = {
  level: 'info' | 'warning';
  message: string;
  action: string;
};

export type { LlmBudgetSummary, TenantBudgetSnapshot } from './admin-costs-types';

function emptyLlmBudgetSummary(): LlmBudgetSummary {
  return {
    tenant_count: 0,
    tenants_at_warning: 0,
    tenants_at_critical: 0,
    total_spend_usd: 0,
  };
}

const CURRENT: Record<string, CostLineItem> = {
  vps_digitalocean: {
    name: 'VPS DigitalOcean',
    cost: 12,
    period: 'month',
    status: 'active',
    description: 'VPS principal — ~2 GB RAM (orden de magnitud; revisar factura DO).',
  },
  cloudflare_proxy: {
    name: 'Cloudflare Proxy',
    cost: 0,
    period: 'month',
    status: 'active',
    description: 'CDN y protección DDoS (plan Free típico).',
  },
  supabase: {
    name: 'Supabase',
    cost: 0,
    period: 'month',
    status: 'active',
    description: 'Base de datos y autenticación (tier según cuenta).',
  },
  resend: {
    name: 'Resend',
    cost: 0,
    period: 'month',
    status: 'active',
    description: 'Envío de emails (free tier / dominio verificado).',
  },
};

const PROPOSED_BASE: Record<string, CostLineItem> = {
  mac2011_worker: {
    name: 'Mac 2011 Worker',
    cost: 0,
    period: 'month',
    status: 'available',
    requires_approval: false,
    description:
      'Worker distribuido (orchestrator BullMQ) contra Redis del control plane; sin coste de proveedor adicional.',
    specs: '16 GB RAM, Ubuntu 22.04, Tailscale (ajustar según equipo real).',
  },
  gcp_failover: {
    name: 'GCP e2-micro Failover',
    cost: 0,
    period: 'month',
    duration: '12 months free (según cuenta GCP)',
    status: 'pending_approval',
    requires_approval: true,
    requires_credit_card: true,
    future_cost: '~$7–10/mes tras 12 meses (revisar precios Compute)',
    description:
      'VM failover en Google Cloud — proyecto GCP de referencia: opslyquantum. Ver docs/FAILOVER-GCP-ARCHITECTURE.md.',
  },
  cloudflare_lb: {
    name: 'Cloudflare Load Balancer',
    cost: 5,
    period: 'month',
    status: 'pending_approval',
    requires_approval: true,
    description: 'LB multi-origen (importe orientativo; ver facturación Cloudflare).',
  },
  vps_upgrade: {
    name: 'VPS Upgrade (4 GB)',
    cost: 24,
    period: 'month',
    status: 'pending_approval',
    requires_approval: true,
    description: 'Subir plan DO (estimación; confirmar en panel).',
  },
};

const approvalByServiceId = new Map<string, CostLineStatus>();

function mergeProposed(): Record<string, CostLineItem> {
  const out: Record<string, CostLineItem> = {};
  for (const [id, item] of Object.entries(PROPOSED_BASE)) {
    const override = approvalByServiceId.get(id);
    out[id] = override === undefined ? { ...item } : { ...item, status: override };
  }
  return out;
}

function sumCurrentMonthly(): number {
  return Object.values(CURRENT).reduce((s, i) => s + i.cost, 0);
}

function sumApprovedProposedMonthly(proposed: Record<string, CostLineItem>): number {
  return Object.values(proposed)
    .filter((i) => i.status === 'approved')
    .reduce((s, i) => s + i.cost, 0);
}

export type AdminCostsPayload = {
  current: Record<string, CostLineItem>;
  proposed: Record<string, CostLineItem>;
  summary: {
    currentMonthly: number;
    proposedMonthly: number;
    potentialSavings: number;
  };
  alerts: CostAlert[];
  /** ISO 8601 — momento de generación de la respuesta. */
  lastUpdated: string;
  /** Presupuesto LLM por tenant (USD, mes UTC); vacío si falla Supabase o no hay datos. */
  tenant_budgets: TenantBudgetSnapshot[];
  llm_budget_summary: LlmBudgetSummary;
};

export function getAdminCostsPayload(): AdminCostsPayload {
  const proposed = mergeProposed();
  const currentMonthly = sumCurrentMonthly();
  const addIfApproved = sumApprovedProposedMonthly(proposed);
  return {
    current: CURRENT,
    proposed,
    summary: {
      currentMonthly,
      proposedMonthly: currentMonthly + addIfApproved,
      potentialSavings: 0,
    },
    alerts: [
      {
        level: 'info',
        message: 'Mac 2011 Worker disponible sin costo adicional de proveedor (misma cola Redis).',
        action: 'enable_mac2011_worker',
      },
      {
        level: 'warning',
        message:
          'GCP Failover (opslyquantum) puede requerir tarjeta para activar cuenta; sin cargo típico en período free según GCP.',
        action: 'review_gcp',
      },
    ],
    lastUpdated: new Date().toISOString(),
    tenant_budgets: [],
    llm_budget_summary: emptyLlmBudgetSummary(),
  };
}

/**
 * Igual que {@link getAdminCostsPayload} más vista de presupuestos LLM por tenant (USD).
 * No implementa wallet prepago (ADR-017).
 */
export async function buildAdminCostsPayloadAsync(): Promise<AdminCostsPayload> {
  const base = getAdminCostsPayload();
  const overview = await fetchTenantBudgetOverview();
  return { ...base, ...overview };
}

export type CostDecisionBody = {
  service_id: string;
  action: 'approve' | 'reject';
  reason?: string;
};

export function parseCostDecisionBody(raw: unknown): CostDecisionBody | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const service_id = typeof o.service_id === 'string' ? o.service_id.trim() : '';
  const actionRaw = o.action;
  const action = actionRaw === 'approve' || actionRaw === 'reject' ? actionRaw : null;
  const reason = typeof o.reason === 'string' ? o.reason : undefined;
  if (service_id.length === 0 || action === null) {
    return null;
  }
  return { service_id, action, reason };
}

export function applyCostDecision(
  body: CostDecisionBody
): { ok: true } | { ok: false; status: number; error: string } {
  const { service_id, action } = body;
  if (!service_id || service_id.length === 0) {
    return { ok: false, status: HTTP_STATUS.BAD_REQUEST, error: 'service_id required' };
  }
  if (action !== 'approve' && action !== 'reject') {
    return { ok: false, status: HTTP_STATUS.BAD_REQUEST, error: 'invalid action' };
  }

  const proposed = PROPOSED_BASE[service_id];
  if (!proposed) {
    return { ok: false, status: HTTP_STATUS.NOT_FOUND, error: 'Service not found' };
  }

  if (action === 'approve') {
    approvalByServiceId.set(service_id, 'approved');
  } else {
    approvalByServiceId.set(service_id, 'rejected');
  }
  return { ok: true };
}
