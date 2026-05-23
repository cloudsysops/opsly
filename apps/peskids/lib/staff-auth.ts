import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { supabaseServer } from './supabase'
import { isStaffUser } from './staff-user'
import type { Database } from './types'

export { isStaffUser } from './staff-user'

export type StaffAuthResult =
  | { ok: true; method: 'secret' | 'supabase'; user?: User }
  | { ok: false; status: number; error: string }

export async function validateStaffRequest(req: NextRequest): Promise<StaffAuthResult> {
  const adminSecret = process.env.DASHBOARD_ADMIN_SECRET?.trim() ?? ''
  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''
  const cookieToken = req.cookies.get('admin-token')?.value?.trim() ?? ''

  if (adminSecret && (bearer === adminSecret || cookieToken === adminSecret)) {
    return { ok: true, method: 'secret' }
  }

  if (!bearer) {
    return await validateStaffSessionFromCookies(req.cookies.getAll())
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, status: 503, error: 'Staff auth not configured' }
  }

  try {
    const supabase = supabaseServer(bearer)
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return { ok: false, status: 401, error: 'Unauthorized' }
    }
    if (!isStaffUser(user)) {
      return { ok: false, status: 403, error: 'Forbidden' }
    }

    return { ok: true, method: 'supabase', user }
  } catch {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
}

async function validateStaffSessionFromCookies(
  requestCookies: Array<{ name: string; value: string }>
): Promise<StaffAuthResult> {
  const adminSecret = process.env.DASHBOARD_ADMIN_SECRET?.trim() ?? ''
  const cookieToken = requestCookies.find((cookie) => cookie.name === 'admin-token')?.value?.trim() ?? ''

  if (adminSecret && cookieToken === adminSecret) {
    return { ok: true, method: 'secret' }
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { ok: false, status: 503, error: 'Staff auth not configured' }
  }

  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return requestCookies.map(({ name, value }) => ({ name, value }))
          },
          setAll() {
            return undefined
          },
        },
      }
    )

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return { ok: false, status: 401, error: 'Unauthorized' }
    }
    if (!isStaffUser(user)) {
      return { ok: false, status: 403, error: 'Forbidden' }
    }

    return { ok: true, method: 'supabase', user }
  } catch {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
}

export async function validateStaffSession(): Promise<StaffAuthResult> {
  const adminSecret = process.env.DASHBOARD_ADMIN_SECRET?.trim() ?? ''
  const cookieStore = await cookies()
  const cookieToken = cookieStore.get('admin-token')?.value?.trim() ?? ''

  if (adminSecret && cookieToken === adminSecret) {
    return { ok: true, method: 'secret' }
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { ok: false, status: 503, error: 'Staff auth not configured' }
  }

  try {
    const supabase = createRouteHandlerClient<Database>({
      cookies: async () => cookieStore,
    })

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return { ok: false, status: 401, error: 'Unauthorized' }
    }
    if (!isStaffUser(user)) {
      return { ok: false, status: 403, error: 'Forbidden' }
    }

    return { ok: true, method: 'supabase', user }
  } catch {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
}
