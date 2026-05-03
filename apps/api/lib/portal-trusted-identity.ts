import type { User } from '@supabase/supabase-js';
import { HTTP_STATUS } from './constants';
import { getUserFromAuthorizationHeader } from './portal-auth';
import {
  fetchPortalTenantMembership,
  fetchPortalTenantRowBySlug,
  ownerEmailFallbackRole,
  readPortalTenantSlugFromUser,
  type PortalTenantMembershipRow,
  type PortalTenantRow,
} from './portal-me';
import type { TenantMemberRole } from './supabase/types';

export const PORTAL_READ_ROLES = ['owner', 'admin', 'operator', 'viewer'] as const;
export const PORTAL_WRITE_ROLES = ['owner', 'admin', 'operator'] as const;

export type TrustedPortalMembership =
  | {
      source: 'tenant_memberships';
      role: TenantMemberRole;
      row: PortalTenantMembershipRow;
    }
  | {
      source: 'owner_email_legacy';
      role: 'owner';
      row: null;
    };

export type TrustedPortalSessionOptions = {
  allowedRoles?: readonly TenantMemberRole[];
};

/** Sesión portal verificada: JWT + tenant membership activa (o fallback owner_email legacy). */
export type TrustedPortalSession = {
  user: User;
  tenant: PortalTenantRow;
  membership: TrustedPortalMembership;
};

type Fail = { ok: false; response: Response };
type Ok = { ok: true; session: TrustedPortalSession };

function jsonFail(status: number, error: string): Fail {
  return { ok: false, response: Response.json({ error }, { status }) };
}

function roleAllowed(role: TenantMemberRole, allowedRoles: readonly TenantMemberRole[]): boolean {
  return allowedRoles.includes(role);
}

type TenantLookupFail = Extract<
  Awaited<ReturnType<typeof fetchPortalTenantRowBySlug>>,
  { ok: false }
>;

function failForTenantLookup(lookup: TenantLookupFail): Fail {
  const status = lookup.reason === 'db' ? HTTP_STATUS.INTERNAL_ERROR : HTTP_STATUS.NOT_FOUND;
  const message = lookup.reason === 'db' ? 'Internal server error' : 'Tenant not found';
  return jsonFail(status, message);
}

type BuiltMembership =
  | { kind: 'ok'; membership: TrustedPortalMembership }
  | { kind: 'db_error' }
  | { kind: 'none' };

async function requirePortalUserContext(
  request: Request
): Promise<{ ok: true; user: User; slug: string; emailNorm: string } | Fail> {
  const user = await getUserFromAuthorizationHeader(request);
  if (!user) {
    return jsonFail(HTTP_STATUS.UNAUTHORIZED, 'Unauthorized');
  }
  const slug = readPortalTenantSlugFromUser(user);
  if (!slug) {
    return jsonFail(HTTP_STATUS.FORBIDDEN, 'No tenant associated with this account');
  }
  const emailNorm = user.email?.trim().toLowerCase() ?? '';
  if (emailNorm.length === 0) {
    return jsonFail(HTTP_STATUS.FORBIDDEN, 'Forbidden');
  }
  return { ok: true, user, slug, emailNorm };
}

async function buildTrustedPortalMembership(
  user: User,
  emailNorm: string,
  tenant: PortalTenantRow
): Promise<BuiltMembership> {
  const membershipLookup = await fetchPortalTenantMembership({
    tenantId: tenant.id,
    userId: user.id,
    email: emailNorm,
  });
  if (membershipLookup.ok) {
    return {
      kind: 'ok',
      membership: {
        source: 'tenant_memberships',
        role: membershipLookup.row.role,
        row: membershipLookup.row,
      },
    };
  }
  if (membershipLookup.reason === 'db') {
    return { kind: 'db_error' };
  }
  const fallbackRole = ownerEmailFallbackRole(tenant, emailNorm);
  if (!fallbackRole) {
    return { kind: 'none' };
  }
  return {
    kind: 'ok',
    membership: { source: 'owner_email_legacy', role: fallbackRole, row: null },
  };
}

/**
 * Zero-trust base para rutas portal: misma regla que `GET /api/portal/me`.
 * Reutilizar en feedback, mode, y futuras rutas bajo `/api/portal/*`.
 */
export async function resolveTrustedPortalSession(
  request: Request,
  options: TrustedPortalSessionOptions = {}
): Promise<Ok | Fail> {
  const allowedRoles = options.allowedRoles ?? PORTAL_WRITE_ROLES;
  const ctx = await requirePortalUserContext(request);
  if (!ctx.ok) {
    return ctx;
  }
  const { user, slug, emailNorm } = ctx;

  const lookup = await fetchPortalTenantRowBySlug(slug);
  if (!lookup.ok) {
    return failForTenantLookup(lookup);
  }

  const built = await buildTrustedPortalMembership(user, emailNorm, lookup.row);
  if (built.kind === 'db_error') {
    return jsonFail(HTTP_STATUS.INTERNAL_ERROR, 'Internal server error');
  }
  if (built.kind === 'none' || !roleAllowed(built.membership.role, allowedRoles)) {
    return jsonFail(HTTP_STATUS.FORBIDDEN, 'Forbidden');
  }

  return { ok: true, session: { user, tenant: lookup.row, membership: built.membership } };
}

/**
 * Compara un `slug` (p. ej. de `params` en App Router) con el tenant ya verificado.
 * No sustituye `resolveTrustedPortalSession`: úsalo después de obtener la sesión.
 */
export function tenantSlugMatchesSession(session: TrustedPortalSession, slug: string): boolean {
  return session.tenant.slug === slug;
}
