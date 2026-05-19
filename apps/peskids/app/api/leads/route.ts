import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { emitLeadCreated } from '@/lib/events'

export async function POST(request: NextRequest) {
  try {
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
    const { data, error } = await supabase
      .from('leads')
      .insert({
        tenant_id: tenantId,
        name,
        email,
        phone: phone || null,
        grade_interested,
        referral_source: referral_source || null,
        status: 'new',
      })
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
    try {
      await emitLeadCreated(
        data.id,
        data.name,
        data.email,
        data.phone,
        data.grade_interested,
        data.referral_source
      )
    } catch (eventError) {
      console.error('Event emission error:', eventError)
    }

    return NextResponse.json(
      { id: data.id, message: 'Lead created successfully' },
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
