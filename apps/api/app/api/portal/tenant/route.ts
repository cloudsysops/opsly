import type { Json } from "../../../../lib/supabase/types";
import { HTTP_STATUS } from "../../../../lib/constants";
import { getUserFromAuthorizationHeader } from "../../../../lib/portal-auth";
import { getServiceClient } from "../../../../lib/supabase";

const REACHABLE_TIMEOUT_MS = 5_000;
const TENANT_FIELDS = "id, slug, name, owner_email, plan, status, services, created_at";

type TenantFetchResult =
  | { tenant: null; errorStatus: number; errorMessage: string }
  | { tenant: Record<string, unknown>; errorStatus: null; errorMessage: null };

function readStringField(services: Json, key: string): string | null {
  if (services === null || typeof services !== "object" || Array.isArray(services)) {
    return null;
  }
  const v = (services as Record<string, unknown>)[key];
  return typeof v === "string" ? v : null;
}

async function urlReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(REACHABLE_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function portalModeFromMetadata(
  meta: Record<string, unknown> | undefined,
): "developer" | "managed" | null {
  if (!meta) return null;
  const m = meta.portal_mode;
  return m === "developer" || m === "managed" ? m : null;
}

async function fetchTenantForUser(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
}): Promise<TenantFetchResult> {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const slugFromMeta =
    meta && typeof meta.tenant_slug === "string" ? meta.tenant_slug : null;

  let query = getServiceClient()
    .schema("platform")
    .from("tenants")
    .select(TENANT_FIELDS)
    .is("deleted_at", null);

  if (slugFromMeta?.length) {
    query = query.eq("slug", slugFromMeta);
  } else if (user.email) {
    query = query.eq("owner_email", user.email);
  } else {
    return {
      tenant: null,
      errorStatus: HTTP_STATUS.NOT_FOUND,
      errorMessage: "No tenant linked to this account",
    };
  }

  const { data: tenant, error } = await query.maybeSingle();
  if (error) {
    console.error("portal tenant:", error);
    return {
      tenant: null,
      errorStatus: HTTP_STATUS.INTERNAL_ERROR,
      errorMessage: "Internal server error",
    };
  }
  if (!tenant) {
    return {
      tenant: null,
      errorStatus: HTTP_STATUS.NOT_FOUND,
      errorMessage: "Tenant not found",
    };
  }
  if (user.email && tenant.owner_email.toLowerCase() !== user.email.toLowerCase()) {
    return {
      tenant: null,
      errorStatus: HTTP_STATUS.FORBIDDEN,
      errorMessage: "Forbidden",
    };
  }

  return { tenant, errorStatus: null, errorMessage: null };
}

export async function GET(request: Request): Promise<Response> {
  const user = await getUserFromAuthorizationHeader(request);
  if (!user) {
    return Response.json(
      { error: "Unauthorized" },
      { status: HTTP_STATUS.UNAUTHORIZED },
    );
  }

  const result = await fetchTenantForUser(user);
  if (result.errorStatus !== null) {
    return Response.json({ error: result.errorMessage }, { status: result.errorStatus });
  }

  const services = result.tenant.services as Json;
  const n8nUrl = readStringField(services, "n8n");
  const uptimeUrl = readStringField(services, "uptime_kuma");
  const [n8nOk, uptimeOk] = await Promise.all([
    n8nUrl ? urlReachable(n8nUrl) : Promise.resolve(false),
    uptimeUrl ? urlReachable(uptimeUrl) : Promise.resolve(false),
  ]);

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  return Response.json({
    slug: result.tenant.slug,
    name: result.tenant.name,
    plan: result.tenant.plan,
    status: result.tenant.status,
    mode: portalModeFromMetadata(meta),
    tenant_id: result.tenant.id,
    created_at: result.tenant.created_at,
    services: {
      n8n_url: n8nUrl,
      uptime_url: uptimeUrl,
      n8n_user: readStringField(services, "n8n_basic_auth_user"),
      n8n_password: readStringField(services, "n8n_basic_auth_password"),
    },
    health: { n8n_reachable: n8nOk, uptime_reachable: uptimeOk },
  });
}
