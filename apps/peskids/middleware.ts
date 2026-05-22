import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  if (path === '/admin/login') {
    return NextResponse.next()
  }

  if (path.startsWith('/admin')) {
    const adminSecret = process.env.DASHBOARD_ADMIN_SECRET
    const adminToken = req.cookies.get('admin-token')?.value

    if (!adminSecret || !adminToken || adminToken !== adminSecret) {
      const login = new URL('/admin/login', req.url)
      return NextResponse.redirect(login)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
