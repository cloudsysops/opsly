import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient, type SetAllCookies } from '@supabase/ssr'
import { isStaffUser } from '@/lib/staff-user'
import type { Database } from '@/lib/types'
import { isPathUnderAuthSurface } from '@/lib/runtime/tenant-auth-surface'

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
    const response = NextResponse.next()
    addSecurityHeaders(response)
    return response
  }

  if (!path.startsWith('/admin')) {
    const response = NextResponse.next()
    addSecurityHeaders(response)
    return response
  }

  const adminSecret = process.env.DASHBOARD_ADMIN_SECRET?.trim() ?? ''
  const adminToken = req.cookies.get('admin-token')?.value?.trim() ?? ''
  if (adminSecret && adminToken === adminSecret) {
    const response = NextResponse.next()
    addSecurityHeaders(response)
    return response
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    const login = new URL('/admin/login', req.url)
    const response = NextResponse.redirect(login)
    addSecurityHeaders(response)
    return response
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
    addSecurityHeaders(response)
    return response
  }

  const login = new URL('/admin/login', req.url)
  const loginResponse = NextResponse.redirect(login)
  addSecurityHeaders(loginResponse)
  return loginResponse
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:"
  )
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin/login'],
}
