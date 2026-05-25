import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient, type SetAllCookies } from '@supabase/ssr'
import { isStaffUser } from '@/lib/staff-user'
import type { Database } from '@/lib/types'

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname
  if (
    path === '/admin/login' ||
    path === '/admin/update-password' ||
    path === '/invite' ||
    path.startsWith('/invite/') ||
    path === '/api/admin/login' ||
    path === '/auth/recovery' ||
    path.startsWith('/auth/')
  ) {
    return NextResponse.next()
  }

  if (!path.startsWith('/admin')) {
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
  matcher: ['/admin', '/admin/:path*', '/api/admin/login'],
}
