import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

type LeadBody = {
  name: string
  email: string
  phone?: string
  class_modality?: 'llanogrande' | 'domicilio'
  neighborhood?: string
  grade_interested: string
  referral_source?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LeadBody

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const supabase = getServiceClient()
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'

    const { data, error } = await supabase.from('leads').insert({
      tenant_id: tenantId,
      name: body.name,
      email: body.email,
      phone: body.phone?.trim() ? body.phone.trim() : null,
      class_modality: body.class_modality || null,
      neighborhood: body.neighborhood || null,
      grade_interested: body.grade_interested,
      referral_source: body.referral_source?.trim() ? body.referral_source.trim() : null,
      status: 'new',
    }).select()

    if (error) {
      console.error('Lead insertion failed:', error.message)
      return NextResponse.json({ error: 'Failed to create lead' }, { status: 400 })
    }

    const lead = data?.[0]
    return NextResponse.json(
      {
        id: lead?.id,
        message: 'Lead created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Peskids lead endpoint error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
