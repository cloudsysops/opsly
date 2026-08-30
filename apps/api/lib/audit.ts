import type { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from './supabase';

export interface AuditEventInput {
  tenant_slug?: string;
  actor_email?: string;
  actor_id?: string;
  action: string;
  resource?: string;
  resource_id?: string;
  resource_type?: string;
  status_code?: number;
  ip?: string | null;
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
      .schema('platform')
      .from('audit_events')
      .insert({
        tenant_slug: event.tenant_slug ?? null,
        actor_email: event.actor_email ?? null,
        actor_id: event.actor_id ?? null,
        action: event.action,
        resource: event.resource ?? event.resource_type ?? 'unknown',
        resource_id: event.resource_id ?? null,
        resource_type: event.resource_type ?? null,
        status_code: event.status_code ?? null,
        ip: event.ip ?? null,
        user_agent: event.user_agent ?? null,
        metadata: event.metadata ?? {},
      });
    if (error) {
      console.error('[audit] insert error:', error.message);
    }
  } catch (err) {
    console.error('[audit] unexpected error:', err);
  }
}

/** Extrae IP real del request respetando cabeceras de proxy. */
export function extractIp(request: NextRequest | Request): string | null {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    null
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
  actorEmail?: string
): void {
  const method = request.method;
  if (!['POST', 'PATCH', 'DELETE'].includes(method)) {
    return;
  }
  void logAuditEvent({
    tenant_slug: tenantSlug,
    actor_email: actorEmail,
    action: method,
    resource: request.nextUrl.pathname,
    ip: extractIp(request),
    user_agent: request.headers.get('user-agent') ?? undefined,
  });
}
