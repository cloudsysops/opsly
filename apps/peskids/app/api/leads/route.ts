import { NextRequest, NextResponse } from 'next/server'

const OPSLY_API_BASE_URL = process.env.OPSLY_API_BASE_URL || 'https://api.op-sly.com'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const response = await fetch(`${OPSLY_API_BASE_URL}/api/public/tenants/peskids/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(payload, { status: response.status })
    }

    return NextResponse.json(
      {
        id: payload.lead_id,
        message: 'Lead created successfully',
        ...payload,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Peskids lead proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
