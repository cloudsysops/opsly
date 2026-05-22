import { NextRequest, NextResponse } from 'next/server'

const OPSLY_API_BASE_URL = process.env.OPSLY_API_BASE_URL || 'https://api.op-sly.com'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const response = await fetch(`${OPSLY_API_BASE_URL}/api/public/tenants/peskids/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        child_name: body.child_name,
        satisfaction: body.satisfaction,
        suggestion: body.suggestion,
        contact_me_back: body.contact_me_back ?? body.contact_wanted ?? false,
      }),
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(payload, { status: response.status })
    }

    return NextResponse.json(
      {
        id: payload.feedback_id,
        message: 'Feedback submitted successfully',
        ...payload,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Peskids feedback proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
