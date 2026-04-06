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

/** Respuesta documentada de POST /api/invitations (consumo futuro en UI). */
export type AdminInvitationResponse = {
  ok: true;
  tenant_id: string;
  link: string;
  email: string;
  token: string;
};
