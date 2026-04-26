import { sendPortalInvitationForTenant } from './portal-invitations';
import { getServiceClient } from './supabase';

export type InvitationBodyInput = {
  slug?: string;
  tenantRef?: string;
  email: string;
  name?: string;
  mode?: 'developer' | 'managed';
};

type TenantRow = {
  id: string;
  slug: string;
  name: string | null;
  owner_email: string;
  status: string;
};

function resolveSlug(input: InvitationBodyInput): string {
  const s = input.slug ?? input.tenantRef;
  if (!s) {
    throw new Error('slug or tenantRef required');
  }
  return s;
}

function resolveDisplayName(tenant: TenantRow, bodyName: string | undefined): string {
  const tenantName =
    typeof tenant.name === 'string' && tenant.name.trim().length > 0
      ? tenant.name.trim()
      : tenant.slug;
  if (bodyName?.trim() && bodyName.trim().length > 0) {
    return bodyName.trim();
  }
  return tenantName;
}

async function fetchTenantRow(
  slug: string
): Promise<{ ok: true; tenant: TenantRow } | { ok: false; response: Response }> {
  const { data: tenant, error } = await getServiceClient()
    .schema('platform')
    .from('tenants')
    .select('id, slug, name, owner_email, status')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code: unknown }).code)
        : 'unknown';
    console.error('invitations tenant lookup failed', { code });
    return {
      ok: false,
      response: Response.json({ error: 'Internal server error' }, { status: 500 }),
    };
  }
  if (!tenant) {
    return {
      ok: false,
      response: Response.json({ error: 'Tenant not found' }, { status: 404 }),
    };
  }
  return { ok: true, tenant };
}

function ensureOwnerEmail(tenant: TenantRow, emailNorm: string): Response | null {
  if (tenant.owner_email.toLowerCase() !== emailNorm) {
    return Response.json({ error: 'Email does not match tenant owner' }, { status: 403 });
  }
  return null;
}

export async function executeAdminInvitation(input: InvitationBodyInput): Promise<Response> {
  const slug = resolveSlug(input);
  const emailNorm = input.email.toLowerCase();
  const gate = await fetchTenantRow(slug);
  if (!gate.ok) {
    return gate.response;
  }
  const { tenant } = gate;
  const forbidden = ensureOwnerEmail(tenant, emailNorm);
  if (forbidden) {
    return forbidden;
  }

  const displayName = resolveDisplayName(tenant, input.name);

  try {
    const { link, token } = await sendPortalInvitationForTenant({
      email: input.email,
      name: displayName,
      slug: tenant.slug,
      mode: input.mode,
    });
    return Response.json({
      ok: true,
      tenant_id: tenant.id,
      link,
      email: emailNorm,
      token,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invite failed';
    console.error('sendPortalInvitationForTenant failed [REDACTED]');
    return Response.json({ error: message }, { status: 500 });
  }
}
