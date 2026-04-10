/**
 * Session Store — persiste y recupera contexto de sesiones de agente en Supabase.
 *
 * Usa la API REST de Supabase directamente con fetch + SUPABASE_SERVICE_ROLE_KEY,
 * sin añadir @supabase/supabase-js como dependencia de este workspace.
 *
 * La tabla `platform.agent_sessions` se creó en migración 0019_agent_sessions.sql.
 *
 * TTL por plan (calculado en `ttl-policy.ts`):
 *   startup: 24h  |  business: 7d  |  enterprise: 30d
 */

import { getSessionExpiry, isExpired, type TenantPlan } from "./ttl-policy.js";

export interface AgentSession {
  id?: string;
  tenant_slug: string;
  session_key: string;
  agent_role: "planner" | "executor" | "tool" | "notifier";
  summary: string;
  open_items: unknown[];
  decisions: unknown[];
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
}

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const TABLE = "agent_sessions";
const SCHEMA = "platform";

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    "apikey": SERVICE_ROLE_KEY,
    "Accept-Profile": SCHEMA,
    "Content-Profile": SCHEMA,
    "Prefer": "return=representation",
  };
}

function tableUrl(): string {
  return `${SUPABASE_URL}/rest/v1/${TABLE}`;
}

/**
 * Recupera la sesión activa para un (tenant, session_key).
 * Retorna null si no existe o si expiró.
 */
export async function getSession(
  tenantSlug: string,
  sessionKey: string,
): Promise<AgentSession | null> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;

  const url = `${tableUrl()}?tenant_slug=eq.${encodeURIComponent(tenantSlug)}&session_key=eq.${encodeURIComponent(sessionKey)}&limit=1`;

  try {
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) return null;

    const rows = await res.json() as AgentSession[];
    if (!rows.length) return null;

    const session = rows[0];
    if (session.expires_at && isExpired(session.expires_at)) {
      void deleteSession(tenantSlug, sessionKey); // limpieza async; no bloquear
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Crea o actualiza una sesión.
 * Si ya existe (tenant_slug + session_key), hace UPSERT y renueva `expires_at` según el plan.
 */
export async function saveSession(
  session: Omit<AgentSession, "id" | "created_at" | "updated_at">,
  plan: TenantPlan,
): Promise<AgentSession | null> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;

  const payload = {
    ...session,
    expires_at: getSessionExpiry(plan).toISOString(),
  };

  try {
    const res = await fetch(tableUrl(), {
      method: "POST",
      headers: {
        ...headers(),
        "Prefer": "return=representation,resolution=merge-duplicates",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(
        JSON.stringify({
          event: "session_store_error",
          action: "save",
          status: res.status,
          error: err,
          ts: new Date().toISOString(),
        }),
      );
      return null;
    }

    const rows = await res.json() as AgentSession[];
    return rows[0] ?? null;
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "session_store_error",
        action: "save",
        error: err instanceof Error ? err.message : String(err),
        ts: new Date().toISOString(),
      }),
    );
    return null;
  }
}

/**
 * Actualiza campos específicos de una sesión existente.
 * Extiende `expires_at` si se pasa un plan.
 */
export async function updateSession(
  tenantSlug: string,
  sessionKey: string,
  patch: Partial<Pick<AgentSession, "summary" | "open_items" | "decisions" | "metadata">>,
  plan?: TenantPlan,
): Promise<boolean> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return false;

  const url = `${tableUrl()}?tenant_slug=eq.${encodeURIComponent(tenantSlug)}&session_key=eq.${encodeURIComponent(sessionKey)}`;

  const payload: Record<string, unknown> = { ...patch };
  if (plan) payload.expires_at = getSessionExpiry(plan).toISOString();

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Elimina una sesión (GDPR purge o limpieza de expiradas). */
export async function deleteSession(tenantSlug: string, sessionKey: string): Promise<boolean> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return false;

  const url = `${tableUrl()}?tenant_slug=eq.${encodeURIComponent(tenantSlug)}&session_key=eq.${encodeURIComponent(sessionKey)}`;

  try {
    const res = await fetch(url, { method: "DELETE", headers: headers() });
    return res.ok;
  } catch {
    return false;
  }
}

/** Elimina todas las sesiones expiradas de un tenant. */
export async function purgeExpiredSessions(tenantSlug: string): Promise<boolean> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return false;

  const now = new Date().toISOString();
  const url = `${tableUrl()}?tenant_slug=eq.${encodeURIComponent(tenantSlug)}&expires_at=lt.${now}`;

  try {
    const res = await fetch(url, { method: "DELETE", headers: headers() });
    return res.ok;
  } catch {
    return false;
  }
}
