import type { User } from '@supabase/supabase-js';

export const PESKIDS_TENANT_SLUG = 'peskids' as const;

export type FranchiseRole = 'owner' | 'admin' | 'support' | 'teacher';

export type CanonicalPeskidsSession = {
  userId: string;
  tenantSlug: typeof PESKIDS_TENANT_SLUG;
  roles: FranchiseRole[];
  franchiseUnitIds: string[];
  permissions: string[];
};

export type FranchiseUiSession = {
  user: { id: string; email: string | null; name: string | null };
  tenant: { slug: typeof PESKIDS_TENANT_SLUG };
  unitScope: 'all' | string[];
  capabilities: { canReadUnits: boolean };
};

export type FranchiseMembership = {
  user_id: string;
  franchise_id: string;
  role: string;
  active: boolean;
  tenant_slug: string;
};

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function appMetadataValue(
  user: Pick<User, 'user_metadata' | 'app_metadata'>,
  key: string
): unknown {
  return metadataRecord(user.app_metadata)[key];
}

function normalizeRoles(value: unknown): FranchiseRole[] {
  const values = Array.isArray(value) ? value : [value];
  return [
    ...new Set(
      values.filter(
        (role): role is FranchiseRole =>
          role === 'owner' || role === 'admin' || role === 'support' || role === 'teacher'
      )
    ),
  ];
}

export function adaptCanonicalPeskidsSession(input: {
  user: Pick<User, 'id' | 'email' | 'user_metadata' | 'app_metadata'>;
  memberships: readonly FranchiseMembership[];
}): CanonicalPeskidsSession | null {
  const roles = normalizeRoles(
    [appMetadataValue(input.user, 'role'), appMetadataValue(input.user, 'roles')].flat()
  );
  const memberships = input.memberships.filter(
    (membership) =>
      membership.active &&
      membership.user_id === input.user.id &&
      membership.tenant_slug === PESKIDS_TENANT_SLUG &&
      typeof membership.franchise_id === 'string'
  );
  const isGlobal = roles.includes('owner') || roles.includes('admin');
  const membershipRoles = normalizeRoles(memberships.map((membership) => membership.role));
  const effectiveRoles = [...new Set([...roles, ...membershipRoles])];
  const canReadUnits = isGlobal || (effectiveRoles.includes('support') && memberships.length > 0);

  if (!canReadUnits) return null;

  return {
    userId: input.user.id,
    tenantSlug: PESKIDS_TENANT_SLUG,
    roles: effectiveRoles,
    franchiseUnitIds: [...new Set(memberships.map((membership) => membership.franchise_id))],
    permissions: ['franchise.units:read'],
  };
}

export function toFranchiseUiSession(
  session: CanonicalPeskidsSession,
  user: Pick<User, 'id' | 'email' | 'user_metadata' | 'app_metadata'>
): FranchiseUiSession {
  const isGlobal = session.roles.includes('owner') || session.roles.includes('admin');
  const metadata = {
    ...metadataRecord(user.user_metadata),
    ...metadataRecord(user.app_metadata),
  };
  const name = typeof metadata.full_name === 'string' ? metadata.full_name : null;
  return {
    user: { id: user.id, email: user.email ?? null, name },
    tenant: { slug: PESKIDS_TENANT_SLUG },
    unitScope: isGlobal ? 'all' : session.franchiseUnitIds,
    capabilities: { canReadUnits: true },
  };
}

export function unitIdsForScope(session: CanonicalPeskidsSession): 'all' | string[] {
  return session.roles.includes('owner') || session.roles.includes('admin')
    ? 'all'
    : session.franchiseUnitIds;
}
