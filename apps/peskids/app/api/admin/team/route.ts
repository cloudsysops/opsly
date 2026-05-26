import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { tenantRoleFromUserMetadata } from '../../../../../../lib/runtime/src/tenant-identity'
import { validateStaffSession } from '@/lib/staff-auth'
import {
  invitePeskidsTeamMember,
  loadPeskidsTeam,
  type TeamRole,
} from '@/lib/team-management'

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(['admin', 'support', 'teacher']),
})

function canManageTeam(role: TeamRole | null | undefined, method: 'secret' | 'supabase'): boolean {
  if (method === 'secret') return true
  return role === 'owner' || role === 'admin'
}

export async function GET() {
  const auth = await validateStaffSession()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const currentRole =
    auth.method === 'secret' || !auth.user
      ? null
      : (tenantRoleFromUserMetadata(auth.user) as TeamRole | null)
  if (!canManageTeam(currentRole, auth.method)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const team = await loadPeskidsTeam()
  return NextResponse.json({ ok: true, ...team })
}

export async function POST(req: NextRequest) {
  const auth = await validateStaffSession()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const currentRole = auth.ok && auth.user ? (tenantRoleFromUserMetadata(auth.user) as TeamRole | null) : null
  if (!canManageTeam(currentRole, auth.method)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  try {
    const name = parsed.data.name?.trim() || parsed.data.email.split('@')[0] || parsed.data.email
    const invite = await invitePeskidsTeamMember({
      email: parsed.data.email,
      name,
      role: parsed.data.role,
    })
    return NextResponse.json(invite)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to create invite'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
