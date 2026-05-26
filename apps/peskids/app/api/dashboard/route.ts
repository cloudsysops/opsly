import { NextRequest, NextResponse } from 'next/server'
import { validateStaffRequest } from '@/lib/staff-auth'
import { isOperationalStaffUser } from '@/lib/staff-user'
import { fetchDashboardData } from '@/lib/services/dashboard.service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID()

  try {
    const auth = await validateStaffRequest(req)
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error, request_id: requestId },
        { status: auth.status }
      )
    }
    if (auth.method !== 'secret' && auth.user && !isOperationalStaffUser(auth.user)) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden', request_id: requestId },
        { status: 403 }
      )
    }

    const rangeParam = req.nextUrl.searchParams.get('range')
    const range = rangeParam === 'month' ? 'month' : 'week'
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'

    const data = await fetchDashboardData(tenantId, range)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[dashboard] error:', error, { request_id: requestId })
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch dashboard data', request_id: requestId },
      { status: 500 }
    )
  }
}
