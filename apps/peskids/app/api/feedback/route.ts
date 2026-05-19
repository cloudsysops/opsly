import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { emitFeedbackCreated } from '@/lib/events'
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
    const { child_name, satisfaction, suggestion, contact_wanted, parent_email } = body

    // Validation
    if (!child_name || child_name.length < 2 || child_name.length > 50) {
      return NextResponse.json(
        { error: 'Child name must be between 2 and 50 characters' },
        { status: 400 }
      )
    }

    if (typeof satisfaction !== 'number' || satisfaction < 1 || satisfaction > 5) {
      return NextResponse.json(
        { error: 'Satisfaction must be a number between 1 and 5' },
        { status: 400 }
      )
    }

    if (suggestion && suggestion.length > 500) {
      return NextResponse.json(
        { error: 'Suggestion must be 500 characters or less' },
        { status: 400 }
      )
    }

    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'
    const supabase = supabaseServer()

    // Insert into database
    const feedbackPayload: any = {
      tenant_id: tenantId,
      child_name,
      satisfaction,
      suggestion: suggestion || null,
      contact_wanted: contact_wanted || false,
      parent_email: parent_email || null,
    }
    const { data, error } = await supabase
      .from('feedback')
      .insert(feedbackPayload)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create feedback' },
        { status: 500 }
      )
    }

    // Emit event
    const feedback = data as Database['public']['Tables']['feedback']['Row']
    try {
      await emitFeedbackCreated(
        feedback.id,
        feedback.child_name,
        feedback.satisfaction,
        feedback.suggestion,
        feedback.parent_email
      )
    } catch (eventError) {
      console.error('Event emission error:', eventError)
    }

    return NextResponse.json(
      { id: feedback.id, message: 'Feedback submitted successfully' },
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
