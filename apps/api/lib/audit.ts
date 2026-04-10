import type { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "./supabase";

export interface AuditEventInput {
  tenant_slug?: string;
  actor_email?: string;
  action: string;
  resource: string;
  status_code?: number;
  ip?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Registra un evento de auditoría en platform.audit_events.
 * Fire-and-forget: no lanza excepciones al caller.
 */
export async function logAuditEvent(event: AuditEventInput): Promise<void> {
  try {
    const client = getServiceClient();
    const { error } = await client
      .schema("platform")
      .from("audit_events")
      .insert({
        tenant_slug: event.tenant_slug ?? null,
        actor_email: event.actor_email ?? null,
        action: event.action,
        resource: event.resource,
        status_code: event.status_code ?? null,
        ip: event.ip ?? null,
        user_agent: event.user_agent ?? null,
        metadata: event.metadata ?? {},
      });
    if (error) {
      console.error("[audit] insert error:", error.message);
    }
  } catch (err) {
    console.error("[audit] unexpected error:", err);
  }
}

/** Extrae IP real del request respetando cabeceras de proxy. */
export function extractIp(request: NextRequest): string {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/**
 * Loguea automáticamente mutaciones tras el response.
 * Llama a `void logAuditMutation(req, res, slug?)` en route handlers.
 */
export function logAuditMutation(
  request: NextRequest,
  _response: NextResponse | Response,
  tenantSlug?: string,
  actorEmail?: string,
): void {
  const method = request.method;
  if (!["POST", "PATCH", "DELETE"].includes(method)) {
    return;
  }
  void logAuditEvent({
    tenant_slug: tenantSlug,
    actor_email: actorEmail,
    action: method,
    resource: request.nextUrl.pathname,
    ip: extractIp(request),
    user_agent: request.headers.get("user-agent") ?? undefined,
  });
}
