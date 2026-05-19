import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const adminSecret = process.env.DASHBOARD_ADMIN_SECRET

    // Check for admin token in cookie or session
    const adminToken = req.cookies.get('admin-token')?.value

    if (!adminToken || adminToken !== adminSecret) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
