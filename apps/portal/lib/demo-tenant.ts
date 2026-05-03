import type {
  PortalInsightItem,
  PortalInsightsPayload,
  PortalMode,
  PortalTenantPayload,
  PortalUsagePayload,
  PortalUsageSnapshot,
  ShieldScorePayload,
} from '@/types';

export const PORTAL_DEMO_COOKIE = 'opsly_portal_demo';
export const PORTAL_DEMO_MODE_COOKIE = 'opsly_portal_demo_mode';
export const PORTAL_DEMO_EMAIL =
  process.env.NEXT_PUBLIC_PORTAL_DEMO_EMAIL?.trim() || 'cliente.test@opsly.local';
export const PORTAL_DEMO_PASSWORD =
  process.env.NEXT_PUBLIC_PORTAL_DEMO_PASSWORD?.trim() || 'OpslyDemo2026!';
export const PORTAL_DEMO_TENANT_SLUG =
  process.env.NEXT_PUBLIC_PORTAL_DEMO_TENANT_SLUG?.trim() || 'localrank';

export function isPortalDemoHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function isValidPortalDemoLogin(email: string, password: string, hostname: string): boolean {
  return (
    isPortalDemoHost(hostname) &&
    email.trim().toLowerCase() === PORTAL_DEMO_EMAIL.toLowerCase() &&
    password === PORTAL_DEMO_PASSWORD
  );
}

export function normalizePortalDemoMode(value: string | undefined): PortalMode {
  if (value === 'developer' || value === 'managed' || value === 'security_defense') {
    return value;
  }
  return 'managed';
}

export function demoPortalTenantPayload(mode: PortalMode = 'managed'): PortalTenantPayload {
  const slug = PORTAL_DEMO_TENANT_SLUG;
  return {
    slug,
    name: 'LocalRank Demo',
    plan: 'business',
    status: 'active',
    mode,
    tenant_id: 'tenant_demo_localrank',
    created_at: '2026-05-02T00:00:00.000Z',
    services: {
      n8n_url: `https://n8n-${slug}.ops.smiletripcare.com`,
      uptime_url: `https://uptime-${slug}.ops.smiletripcare.com`,
      n8n_user: 'admin',
      n8n_password: 'demo-n8n-password',
    },
    health: {
      n8n_reachable: true,
      uptime_reachable: true,
    },
  };
}

export function demoPortalUsage(period: 'today' | 'month'): PortalUsagePayload {
  return {
    tenant: PORTAL_DEMO_TENANT_SLUG,
    period,
    tokens_input: period === 'today' ? 18420 : 274300,
    tokens_output: period === 'today' ? 7210 : 102900,
    cost_usd: period === 'today' ? 0.18 : 4.72,
    requests: period === 'today' ? 36 : 842,
    cache_hits: period === 'today' ? 9 : 214,
    cache_hit_rate: period === 'today' ? 25 : 25,
  };
}

export function demoPortalUsageSnapshot(): PortalUsageSnapshot {
  return {
    today: demoPortalUsage('today'),
    month: demoPortalUsage('month'),
  };
}

export function demoPortalShieldScore(): ShieldScorePayload {
  const now = '2026-05-02T00:00:00.000Z';
  return {
    tenant_slug: PORTAL_DEMO_TENANT_SLUG,
    current: {
      score: 82,
      breakdown: { critical: 0, high: 1, medium: 2, low: 0 },
      created_at: now,
    },
    history: [
      { score: 78, created_at: '2026-05-01T00:00:00.000Z' },
      { score: 82, created_at: now },
    ],
    risk_level: 'yellow',
  };
}

export function demoPortalInsights(): PortalInsightsPayload {
  const tenantId = demoPortalTenantPayload().tenant_id;
  const now = '2026-05-02T00:00:00.000Z';
  const insights: PortalInsightItem[] = [
    {
      id: 'demo-insight-usage',
      tenant_id: tenantId,
      insight_type: 'usage_anomaly',
      title: 'Pico saludable de uso en workflows CRM',
      summary: 'Los leads entrantes subieron 18% esta semana; mantén activo el digest diario.',
      payload: { source: 'demo' },
      confidence: 0.91,
      impact_score: 78,
      status: 'open',
      read_at: null,
      actioned_at: null,
      created_at: now,
    },
    {
      id: 'demo-insight-revenue',
      tenant_id: tenantId,
      insight_type: 'revenue_forecast',
      title: 'Costo IA bajo control',
      summary: 'La proyección mensual sigue por debajo del presupuesto configurado.',
      payload: { source: 'demo' },
      confidence: 0.87,
      impact_score: 64,
      status: 'open',
      read_at: null,
      actioned_at: null,
      created_at: now,
    },
  ];
  return { tenant_slug: PORTAL_DEMO_TENANT_SLUG, insights };
}

export type DemoBillingPlan = {
  id: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  yearly_price_cents: number;
  currency: string;
  features: Record<string, unknown>;
};

export type DemoSubscription = {
  id: string;
  plan_id: string;
  status: string;
  billing_period: string;
  amount_cents: number;
  currency: string;
  current_period_start: string | null;
  current_period_end: string | null;
  auto_renew: boolean;
  created_at: string;
  cancelled_at: string | null;
};

export type DemoInvoice = {
  id: string;
  invoice_number: string;
  customer_email: string;
  customer_name: string | null;
  status: string;
  subtotal_cents: number;
  tax_rate_percent: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  issue_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  line_items: {
    id: string;
    description: string;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
    category: string | null;
  }[];
  created_at: string;
};

export function demoBillingPlans(): DemoBillingPlan[] {
  return [
    {
      id: 'plan_startup',
      name: 'Startup',
      description: 'Automatizaciones base para equipos pequeños.',
      monthly_price_cents: 4900,
      yearly_price_cents: 49000,
      currency: 'USD',
      features: { workflows: 3, support: 'email' },
    },
    {
      id: 'plan_business',
      name: 'Business',
      description: 'CRM, reportes y monitoreo gestionado.',
      monthly_price_cents: 14900,
      yearly_price_cents: 149000,
      currency: 'USD',
      features: { workflows: 12, support: 'priority' },
    },
    {
      id: 'plan_enterprise',
      name: 'Enterprise',
      description: 'Gobernanza avanzada y automatización a medida.',
      monthly_price_cents: 49900,
      yearly_price_cents: 499000,
      currency: 'USD',
      features: { workflows: 'custom', support: 'sla' },
    },
  ];
}

export function demoSubscription(): DemoSubscription {
  return {
    id: 'sub_demo_business',
    plan_id: 'plan_business',
    status: 'active',
    billing_period: 'monthly',
    amount_cents: 14900,
    currency: 'USD',
    current_period_start: '2026-05-01',
    current_period_end: '2026-06-01',
    auto_renew: true,
    created_at: '2026-05-01T00:00:00.000Z',
    cancelled_at: null,
  };
}

export function demoInvoices(): DemoInvoice[] {
  return [
    {
      id: 'inv_demo_001',
      invoice_number: 'OPS-DEMO-001',
      customer_email: 'cliente@localrank.test',
      customer_name: 'Cliente Demo',
      status: 'sent',
      subtotal_cents: 250000,
      tax_rate_percent: 19,
      tax_cents: 47500,
      total_cents: 297500,
      currency: 'COP',
      issue_date: '2026-05-02',
      due_date: '2026-05-16',
      paid_date: null,
      notes: 'Factura demo generada para validar el portal.',
      line_items: [
        {
          id: 'line_demo_001',
          description: 'Implementación CRM Starter Pack',
          quantity: 1,
          unit_price_cents: 250000,
          total_cents: 250000,
          category: 'crm',
        },
      ],
      created_at: '2026-05-02T00:00:00.000Z',
    },
  ];
}
