import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { emitLeadCreated } from '@/lib/events'
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit'
import type { Database } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const clientId = getClientIdentifier(request.headers)
    if (!rateLimit(clientId, 5, 60000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a few moments.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { name, email, phone, grade_interested, referral_source } = body

    // Validation
    if (!name || name.length < 2 || name.length > 50) {
      return NextResponse.json(
        { error: 'Name must be between 2 and 50 characters' },
        { status: 400 }
      )
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    if (!grade_interested) {
      return NextResponse.json(
        { error: 'Grade level is required' },
        { status: 400 }
      )
    }

    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'
    const supabase = supabaseServer()

    // Insert into database
    const leadPayload: any = {
      tenant_id: tenantId,
      name,
      email,
      phone: phone || null,
      grade_interested,
      referral_source: referral_source || null,
      status: 'new',
    }
    const { data, error } = await supabase
      .from('leads')
      .insert(leadPayload)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create lead' },
        { status: 500 }
      )
    }

    // Emit event
    const lead = data as Database['public']['Tables']['leads']['Row']
    try {
      await emitLeadCreated(
        lead.id,
        lead.name,
        lead.email,
        lead.phone,
        lead.grade_interested,
        lead.referral_source
      )
    } catch (eventError) {
      console.error('Event emission error:', eventError)
    }

    return NextResponse.json(
      { id: lead.id, message: 'Lead created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
