import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { emitFeedbackCreated } from '@/lib/events'
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit'
import type { Database } from '@/lib/types'

const VALID_AUTHOR_TYPES = new Set(['parent', 'teacher', 'staff'] as const)
const VALID_SUBJECT_TYPES = new Set(['general', 'class', 'student', 'operations'] as const)
const VALID_VISIBILITIES = new Set(['public', 'private'] as const)
const VALID_AUDIENCES = new Set(['family', 'teacher', 'admin'] as const)
const VALID_STATUSES = new Set(['new', 'reviewed', 'action_required', 'closed'] as const)

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asOptionalUuid(value: unknown): string | null {
  const raw = asTrimmedString(value)
  if (!raw) return null
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw) ? raw : null
}

function isMissingExpandedFeedbackColumn(error: { message?: string } | null | undefined): boolean {
  const message = error?.message?.toLowerCase() ?? ''
  return (
    message.includes('author_type') ||
    message.includes('author_ref_id') ||
    message.includes('subject_type') ||
    message.includes('subject_ref_id') ||
    message.includes('rating') ||
    message.includes('ai_summary') ||
    message.includes('body') ||
    message.includes('status') ||
    message.includes('visibility') ||
    message.includes('audience')
  )
}

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
    const childName = asTrimmedString(body.child_name ?? body.student_name ?? body.name)
    const message = asTrimmedString(body.body ?? body.suggestion ?? body.feedback ?? body.notes)
    const satisfactionRaw = body.rating ?? body.satisfaction
    const satisfaction = Number(satisfactionRaw)
    const authorType = VALID_AUTHOR_TYPES.has(body.author_type) ? body.author_type : 'parent'
    const subjectType = VALID_SUBJECT_TYPES.has(body.subject_type) ? body.subject_type : 'student'
    const visibility = VALID_VISIBILITIES.has(body.visibility)
      ? body.visibility
      : authorType === 'staff'
        ? 'private'
        : 'public'
    const audience = VALID_AUDIENCES.has(body.audience)
      ? body.audience
      : authorType === 'teacher'
        ? 'family'
        : authorType === 'staff'
          ? 'family'
          : 'teacher'
    const status = VALID_STATUSES.has(body.status) ? body.status : 'new'
    const contactWanted = Boolean(body.contact_wanted)
    const parentEmail = asTrimmedString(body.parent_email) || null
    const authorRefId = asOptionalUuid(body.author_ref_id)
    const subjectRefId = asOptionalUuid(body.subject_ref_id)

    // Validation
    if (!childName || childName.length < 2 || childName.length > 80) {
      return NextResponse.json(
        { error: 'Child name must be between 2 and 80 characters' },
        { status: 400 }
      )
    }

    if (typeof satisfaction !== 'number' || satisfaction < 1 || satisfaction > 5) {
      return NextResponse.json(
        { error: 'Rating must be a number between 1 and 5' },
        { status: 400 }
      )
    }

    if (!message || message.length < 2) {
      return NextResponse.json(
        { error: 'Feedback message is required' },
        { status: 400 }
      )
    }

    if (message.length > 1200) {
      return NextResponse.json(
        { error: 'Feedback message must be 1200 characters or less' },
        { status: 400 }
      )
    }

    if (audience !== 'admin' && !parentEmail) {
      return NextResponse.json(
        { error: 'Family email is required for this feedback' },
        { status: 400 }
      )
    }

    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'
    const supabase = supabaseServer()

    // Insert into database
    const feedbackPayload: Database['public']['Tables']['feedback']['Insert'] = {
      tenant_id: tenantId,
      child_name: childName,
      satisfaction,
      suggestion: message,
      contact_wanted: contactWanted,
      parent_email: parentEmail,
      author_type: authorType,
      author_ref_id: authorRefId,
      subject_type: subjectType,
      subject_ref_id: subjectRefId,
      visibility,
      audience,
      body: message,
      rating: satisfaction,
      status,
    }
    const legacyFeedbackPayload: Database['public']['Tables']['feedback']['Insert'] = {
      tenant_id: tenantId,
      child_name: childName,
      satisfaction,
      suggestion: message,
      contact_wanted: contactWanted,
      parent_email: parentEmail,
    }

    const { data, error } = await supabase
      .from('feedback')
      .insert(feedbackPayload)
      .select()
      .single()

    if (error) {
      if (isMissingExpandedFeedbackColumn(error)) {
        const { data: legacyData, error: legacyError } = await supabase
          .from('feedback')
          .insert(legacyFeedbackPayload)
          .select()
          .single()

        if (legacyError) {
          console.error('Database error:', legacyError)
          return NextResponse.json(
            { error: 'Failed to create feedback' },
            { status: 500 }
          )
        }

        const legacyFeedback = legacyData as Database['public']['Tables']['feedback']['Row']
        try {
          await emitFeedbackCreated({
            feedbackId: legacyFeedback.id,
            childName: legacyFeedback.child_name,
            satisfaction: legacyFeedback.satisfaction,
            suggestion: legacyFeedback.suggestion,
            parentEmail: legacyFeedback.parent_email,
            authorType,
            subjectType,
            visibility,
            audience,
            body: legacyFeedback.suggestion,
            rating: legacyFeedback.satisfaction,
          })
        } catch (eventError) {
          console.error('Event emission error:', eventError)
        }

        return NextResponse.json(
          { id: legacyFeedback.id, message: 'Feedback submitted successfully' },
          { status: 201 }
        )
      }

      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create feedback' }, { status: 500 })
    }

    // Emit event
    const feedback = data as Database['public']['Tables']['feedback']['Row']
    try {
      await emitFeedbackCreated({
        feedbackId: feedback.id,
        childName: feedback.child_name,
        satisfaction: feedback.satisfaction,
        suggestion: feedback.suggestion,
        parentEmail: feedback.parent_email,
        authorType: feedback.author_type,
        subjectType: feedback.subject_type,
        visibility: feedback.visibility,
        audience: feedback.audience,
        body: feedback.body,
        rating: feedback.rating,
      })
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
