import { PORTAL_URL_PROBE } from "./constants";
import { getServiceClient } from "./supabase";
import type { Json, Tenant } from "./supabase/types";

type PortalMode = "developer" | "managed";

function readString(obj: unknown, key: string): string | null {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return null;
  }
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function firstString(
  obj: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const v = readString(obj, key);
    if (v !== null) {
      return v;
    }
  }
  return null;
}

export function parsePortalServices(services: Json): {
  n8n_url: string | null;
  uptime_url: string | null;
  n8n_user: string | null;
  n8n_password: string | null;
} {
  if (
    services === null ||
    typeof services !== "object" ||
    Array.isArray(services)
  ) {
    return {
      n8n_url: null,
      uptime_url: null,
      n8n_user: null,
      n8n_password: null,
    };
  }
  const s = services as Record<string, unknown>;
  const n8n_url = firstString(s, ["n8n"]);
  const uptime_url = firstString(s, ["uptime_kuma", "uptime"]);
  const n8n_user = firstString(s, ["n8n_basic_auth_user", "n8n_user"]);
  const n8n_password = firstString(s, [
    "n8n_basic_auth_password",
    "n8n_password",
  ]);
  return { n8n_url, uptime_url, n8n_user, n8n_password };
}

export function parsePortalMode(meta: unknown): PortalMode | null {
  const raw = readString(meta, "mode") ?? readString(meta, "portal_mode");
  if (raw === "developer" || raw === "managed") {
    return raw;
  }
  return null;
}

export async function portalUrlReachable(url: string | null): Promise<boolean> {
  if (url === null || url.length === 0) {
    return false;
  }
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(PORTAL_URL_PROBE.TIMEOUT_MS),
    });
    return res.status > 0 && res.status < PORTAL_URL_PROBE.STATUS_EXCLUSIVE_MAX;
  } catch {
    return false;
  }
}

export type PortalTenantRow = Pick<
  Tenant,
  | "id"
  | "slug"
  | "name"
  | "owner_email"
  | "plan"
  | "status"
  | "services"
  | "created_at"
>;

export type PortalTenantLookup =
  | { ok: true; row: PortalTenantRow }
  | { ok: false; reason: "db" | "not_found" };

function tenantSlugFromMetadata(metadata: unknown): string | null {
  if (
    metadata === null ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return null;
  }
  const ts = (metadata as Record<string, unknown>).tenant_slug;
  return typeof ts === "string" && ts.length > 0 ? ts : null;
}

export function readPortalTenantSlugFromUser(user: {
  user_metadata?: unknown;
  app_metadata?: unknown;
}): string | null {
  return (
    tenantSlugFromMetadata(user.user_metadata) ??
    tenantSlugFromMetadata(user.app_metadata)
  );
}

export async function fetchPortalTenantRowBySlug(
  slug: string,
): Promise<PortalTenantLookup> {
  const { data: tenant, error } = await getServiceClient()
    .schema("platform")
    .from("tenants")
    .select("id, slug, name, owner_email, plan, status, services, created_at")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("portal tenant lookup:", error);
    return { ok: false, reason: "db" };
  }
  if (!tenant) {
    return { ok: false, reason: "not_found" };
  }
  return { ok: true, row: tenant as PortalTenantRow };
}
