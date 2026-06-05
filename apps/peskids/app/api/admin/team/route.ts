import { NextRequest } from 'next/server';
import { z } from 'zod';
import { tenantRoleFromUserMetadata } from '@/lib/runtime/tenant-identity';
import { validateStaffSession } from '@/lib/staff-auth';
import { invitePeskidsTeamMember, loadPeskidsTeam, type TeamRole } from '@/lib/team-management';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(['admin', 'support', 'teacher']),
});

function canManageTeam(role: TeamRole | null | undefined, method: 'secret' | 'supabase'): boolean {
  if (method === 'secret') return true;
  return role === 'owner' || role === 'admin';
}

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const currentRole =
    auth.ok && auth.user ? (tenantRoleFromUserMetadata(auth.user) as TeamRole | null) : null;
  if (!canManageTeam(currentRole, auth.method)) {
    return errorJson(requestId, 'Forbidden', 403);
  }

  const team = await loadPeskidsTeam();
  return successJson(requestId, { ok: true, ...team });
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const currentRole =
    auth.ok && auth.user ? (tenantRoleFromUserMetadata(auth.user) as TeamRole | null) : null;
  if (!canManageTeam(currentRole, auth.method)) {
    return errorJson(requestId, 'Forbidden', 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(requestId, 'Invalid payload', 400);
  }

  try {
    const name = parsed.data.name?.trim() || parsed.data.email.split('@')[0] || parsed.data.email;
    const invite = await invitePeskidsTeamMember({
      email: parsed.data.email,
      name,
      role: parsed.data.role,
    });
    return successJson(requestId, { ok: true, invite });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to create invite';
    return errorJson(requestId, message, 500);
  }
}
