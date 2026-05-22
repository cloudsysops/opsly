import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

const OPSLY_API_BASE_URL = process.env.OPSLY_API_BASE_URL || 'https://api.op-sly.com'

type LeadBody = {
  name: string
  email: string
  phone?: string
  class_modality: 'llanogrande' | 'domicilio'
  neighborhood: string
  grade_interested: string
  referral_source?: string
}

async function mirrorLeadToTenantDb(body: LeadBody): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return
  }

  try {
    const supabase = getServiceClient()
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'
    const { error } = await supabase.from('leads').insert({
      tenant_id: tenantId,
      name: body.name,
      email: body.email,
      phone: body.phone?.trim() ? body.phone.trim() : null,
      class_modality: body.class_modality,
      neighborhood: body.neighborhood,
      grade_interested: body.grade_interested,
      referral_source: body.referral_source?.trim() ? body.referral_source.trim() : null,
      status: 'new',
    })

    if (error) {
      console.error('Lead mirror to public.leads failed:', error.message)
    }
  } catch (err) {
    console.error('Lead mirror to public.leads error:', err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LeadBody
    const response = await fetch(`${OPSLY_API_BASE_URL}/api/public/tenants/peskids/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      lead_id?: string
      error?: string
      [key: string]: unknown
    }

    if (!response.ok) {
      return NextResponse.json(payload, { status: response.status })
    }

    if (typeof payload.lead_id === 'string') {
      await mirrorLeadToTenantDb(body)
    }

    return NextResponse.json(
      {
        ...payload,
        id: payload.lead_id,
        message: 'Lead created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Peskids lead proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
