import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isStaffUser } from '@/lib/staff-user'
import type { Database } from '@/lib/types'

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname
  if (
    path === '/admin/login' ||
    path === '/admin/update-password' ||
    path === '/api/admin/login' ||
    path === '/auth/recovery' ||
    path.startsWith('/auth/')
  ) {
    return NextResponse.next()
  }

  if (!path.startsWith('/admin')) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({
    req: req as any,
    res: response as any,
  })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && isStaffUser(user)) {
    return response
  }

  const adminSecret = process.env.DASHBOARD_ADMIN_SECRET?.trim() ?? ''
  const adminToken = req.cookies.get('admin-token')?.value?.trim() ?? ''
  if (adminSecret && adminToken === adminSecret) {
    return response
  }

  const login = new URL('/admin/login', req.url)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin/login'],
}
