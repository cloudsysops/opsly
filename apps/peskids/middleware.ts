import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient, type SetAllCookies } from '@supabase/ssr'
import {
  isAdminSurfaceUser,
  isSupportSurfaceUser,
  isTeacherSurfaceUser,
} from '@/lib/staff-user'
import type { Database } from '@/lib/types'
import { isPathUnderAuthSurface } from '../../lib/runtime/src/tenant-auth-surface'

const PESKIDS_AUTH_SURFACE = {
  entryPaths: ['/', '/admin/login', '/teacher/login', '/support/login'],
  loginPaths: ['/admin/login', '/teacher/login', '/support/login'],
  invitePath: '/invite',
  recoveryPath: '/auth/recovery',
  updatePasswordPaths: ['/admin/update-password', '/teacher/update-password', '/support/update-password'],
  authPrefixes: ['/auth/', '/teacher/login/', '/support/login/'],
} as const

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname
  if (isPathUnderAuthSurface(path, PESKIDS_AUTH_SURFACE) || path === '/api/admin/login') {
    return NextResponse.next()
  }

  const surface = path.startsWith('/teacher')
    ? 'teacher'
    : path.startsWith('/support')
      ? 'support'
      : path.startsWith('/admin')
        ? 'admin'
        : null

  if (!surface) {
    return NextResponse.next()
  }

  const adminSecret = process.env.DASHBOARD_ADMIN_SECRET?.trim() ?? ''
  const adminToken = req.cookies.get('admin-token')?.value?.trim() ?? ''
  if (adminSecret && adminToken === adminSecret) {
    return NextResponse.next()
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    const login = new URL(path.startsWith('/support') ? '/support/login' : '/admin/login', req.url)
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

  const hasSurfaceAccess =
    user &&
    (surface === 'teacher'
      ? isTeacherSurfaceUser(user)
      : surface === 'support'
        ? isSupportSurfaceUser(user)
        : isAdminSurfaceUser(user))

  if (hasSurfaceAccess) {
    return response
  }

  const login = new URL(
    surface === 'teacher' ? '/teacher/login' : surface === 'support' ? '/support/login' : '/admin/login',
    req.url
  )
  return NextResponse.redirect(login)
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/support',
    '/support/:path*',
    '/teacher',
    '/teacher/:path*',
    '/api/admin/login',
  ],
}
