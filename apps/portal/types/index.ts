/**
 * Tipos compartidos del portal (cliente y server).
 * Importar desde `@/types` o vía re-export en `@/lib/types`.
 */

export type PortalMode = 'developer' | 'managed' | 'security_defense';

export type PortalTenantPayload = {
  slug: string;
  name: string;
  plan: string;
  status: string;
  mode: PortalMode | null;
  tenant_id: string;
  created_at: string;
  services: {
    n8n_url: string | null;
    uptime_url: string | null;
    n8n_user: string | null;
    n8n_password: string | null;
  };
  health: {
    n8n_reachable: boolean;
    uptime_reachable: boolean;
  };
};

export type PortalUsagePeriod = 'today' | 'month';

/** Respuesta de `GET /api/portal/usage` (alineada con la API). */
export type PortalUsagePayload = {
  tenant: string;
  period: PortalUsagePeriod;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  requests: number;
  cache_hits: number;
  cache_hit_rate: number;
};

export type PortalUsageSnapshot = {
  today: PortalUsagePayload | null;
  month: PortalUsagePayload | null;
};

/** Respuesta `GET /api/portal/tenant/[slug]/n8n-marketplace/installs`. */
export type PortalN8nMarketplaceInstallsPayload = {
  tenant: string;
  installs: {
    catalog_item_id: string;
    catalog_version: string;
    status: string;
    activated_at: string;
  }[];
  billing_usage?: {
    pack_metering_events_this_month: number;
  };
};

/** Respuesta `GET /api/portal/billing/summary` (uso asentado + pendiente, USD). */
export type PortalBillingSummaryPayload = {
  period_start: string;
  period_end: string;
  currency: string;
  settled_cost_usd: number;
  pending_cost_usd: number;
  current_total_usd: number;
  projected_month_end_usd: number;
  daily_average_usd: number;
};

/** Ítem de `GET /api/portal/tenant/[slug]/insights`. */
export type PortalInsightItem = {
  id: string;
  tenant_id: string;
  insight_type: string;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  confidence: number;
  impact_score: number;
  status: string;
  read_at: string | null;
  actioned_at: string | null;
  created_at: string;
};

export type PortalInsightsPayload = {
  tenant_slug: string;
  insights: PortalInsightItem[];
};

export type PortalHealthPayload = {
  slug: string;
  name: string;
  plan: string;
  status: string;
  services: {
    n8n_url: string | null;
    uptime_url: string | null;
    n8n_user: string | null;
    n8n_password: string | null;
  };
  health: {
    n8n_reachable: boolean;
    uptime_reachable: boolean;
    checked_at: string;
  };
};

/** Respuesta documentada de POST /api/invitations (consumo futuro en UI). */
export type AdminInvitationResponse = {
  ok: true;
  tenant_id: string;
  link: string;
  email: string;
  token: string;
};

/** Body para POST /api/portal/onboarding. */
export type OnboardingRequest = {
  org_name: string;
  slug: string;
  plan: 'startup' | 'business' | 'enterprise';
};

/** Respuesta de POST /api/portal/onboarding. */
export type OnboardingResponse = {
  ok: true;
  tenant_id: string;
  slug: string;
  org_name: string;
  plan: 'startup' | 'business' | 'enterprise';
  bootstrap: {
    workers_deployed: number;
    job_name: string;
  };
};

/** Body de POST /api/provisioning/quote. */
export type ProvisioningQuoteRequest = {
  provider: 'aws' | 'azure' | 'gcp';
  plan: 'free-tier' | 'serverless-starter';
};

/** Respuesta de POST /api/provisioning/quote. */
export type ProvisioningQuoteResponse = {
  provider: string;
  plan: string;
  cloud_cost_estimated_usd: number;
  currency_cloud: string;
  is_free_tier: boolean;
  opsly_fee_usd: number;
  total_monthly_usd: number;
  line_items: readonly { label: string; amountUsd: number }[];
  terms: string;
};
