import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient, type SetAllCookies } from '@supabase/ssr'
import { isStaffUser } from '@/lib/staff-user'
import type { Database } from '@/lib/types'
import { isPathUnderAuthSurface } from '@/lib/runtime/tenant-auth-surface'
import { getAuthPublicConfig } from '@/lib/auth-public-config'

const PESKIDS_AUTH_SURFACE = {
  entryPaths: ['/', '/admin/login'],
  loginPaths: ['/admin/login'],
  invitePath: '/invite',
  recoveryPath: '/auth/recovery',
  updatePasswordPaths: ['/admin/update-password'],
  authPrefixes: ['/auth/'],
} as const

const LOGIN_PATHS = new Set([
  '/admin/login',
  '/teacher/login',
  '/support/login',
  '/familias/login',
])

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname
  if (
    isPathUnderAuthSurface(path, PESKIDS_AUTH_SURFACE) ||
    LOGIN_PATHS.has(path) ||
    path === '/api/admin/login'
  ) {
    return NextResponse.next()
  }

  if (!path.startsWith('/admin') && !path.startsWith('/setup')) {
    return NextResponse.next()
  }

  const adminSecret = process.env.DASHBOARD_ADMIN_SECRET?.trim() ?? ''
  const adminToken = req.cookies.get('admin-token')?.value?.trim() ?? ''
  if (adminSecret && adminToken === adminSecret) {
    return NextResponse.next()
  }

  const { supabaseUrl: url, supabaseAnonKey: anon, configured } = getAuthPublicConfig()
  if (!configured || !url || !anon) {
    const login = new URL('/admin/login', req.url)
    return NextResponse.redirect(login)
  }

  let response = NextResponse.next({ request: req })
  const supabase = createServerClient<Database>(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value }) => {
          req.cookies.set(name, value)
        })
        response = NextResponse.next({ request: req })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && isStaffUser(user)) {
    return response
  }

  const login = new URL('/admin/login', req.url)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/setup', '/setup/:path*', '/api/admin/login'],
}
