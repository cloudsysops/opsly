/**
 * Compat shims for routes that incorrectly imported @intcloudsysops/security
 * (that package has no adminAuth / portal session helpers).
 * Soft-launch hotfix so Peskids Docker image builds for the stakeholder meeting.
 */

import type { NextRequest } from 'next/server';
import { validateStaffRequest } from '@/lib/staff-auth';
import { validateFamilyRequest } from '@/lib/family-auth';
import { supabaseServer } from '@/lib/supabase';
import { tenantSlugFromUserMetadata } from '@/lib/runtime/tenant-identity';

export async function adminAuth(req: Request): Promise<void> {
  const auth = await validateStaffRequest(req as NextRequest);
  if (!auth.ok) {
    const error = new Error(auth.error);
    Object.assign(error, { status: auth.status });
    throw error;
  }
}

export type TrustedPortalSession = {
  userId: string;
  email?: string;
  studentId?: string;
  tenantSlug: string;
};

async function resolvePrimaryStudentId(parentEmail: string): Promise<string | undefined> {
  const expectedTenant = (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
  const client = supabaseServer();
  const { data, error } = await client
    .from('students')
    .select('id')
    .eq('tenant_id', expectedTenant)
    .ilike('parent_email', parentEmail)
    .limit(1);

  if (error || !Array.isArray(data) || data.length === 0) {
    return undefined;
  }

  const row = data[0] as { id?: string } | undefined;
  return typeof row?.id === 'string' ? row.id : undefined;
}

export async function resolveTrustedPortalSession(
  req: Request
): Promise<TrustedPortalSession | null> {
  const auth = await validateFamilyRequest(req as NextRequest);
  if (!auth.ok) {
    return null;
  }

  const expectedTenant = (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
  const tenantSlug = tenantSlugFromUserMetadata(auth.user) || expectedTenant;
  const email = auth.user.email?.trim().toLowerCase();
  const studentId = email ? await resolvePrimaryStudentId(email) : undefined;

  return {
    userId: auth.user.id,
    email,
    studentId,
    tenantSlug,
  };
}
