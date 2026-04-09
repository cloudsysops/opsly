/**
 * Tipos compartidos del portal (cliente y server).
 * Importar desde `@/types` o vía re-export en `@/lib/types`.
 */

export type PortalMode = "developer" | "managed";

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

export type PortalUsagePeriod = "today" | "month";

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

/** Respuesta documentada de POST /api/invitations (consumo futuro en UI). */
export type AdminInvitationResponse = {
  ok: true;
  tenant_id: string;
  link: string;
  email: string;
  token: string;
};
