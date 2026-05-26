import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { emitFeedbackCreated } from '@/lib/events'
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { isMissingExpandedFeedbackColumn } from '@/lib/utils/db-compat'
import { feedbackSchema } from '@/lib/validation/feedback.schema'
import { validateFamilyRequest } from '@/lib/family-auth'
import { validateStaffRequest } from '@/lib/staff-auth'
import type { Database } from '@/lib/types'

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()

  try {
    const clientId = getClientIdentifier(request.headers)
    if (!rateLimit(clientId, 5, 60000)) {
      return NextResponse.json(
        { ok: false, error: 'Too many requests. Please try again in a few moments.', request_id: requestId },
        { status: 429 }
      )
    }

    const raw = await request.json()
    const result = feedbackSchema.safeParse(raw)
    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error.issues[0]?.message ?? 'Invalid input', request_id: requestId },
        { status: 400 }
      )
    }

    const data = result.data
    const hasAuthHints = Boolean(request.headers.get('authorization') || request.headers.get('cookie'))
    const staffAuth = hasAuthHints ? await validateStaffRequest(request) : { ok: false } as const
    const familyAuth = !staffAuth.ok && hasAuthHints ? await validateFamilyRequest(request) : { ok: false } as const
    const isStaffRequest = staffAuth.ok
    const isFamilyRequest = familyAuth.ok
    const childName = (data.child_name ?? data.student_name ?? data.name)
    const message = (data.body ?? data.suggestion ?? data.feedback ?? data.notes)
    const satisfaction = (data.rating ?? data.satisfaction)

    if (!childName || childName.length < 2) {
      return NextResponse.json(
        { ok: false, error: 'Child name must be between 2 and 80 characters', request_id: requestId },
        { status: 400 }
      )
    }

    if (!message || message.length < 2) {
      return NextResponse.json(
        { ok: false, error: 'Feedback message is required', request_id: requestId },
        { status: 400 }
      )
    }

    if (satisfaction === undefined) {
      return NextResponse.json(
        { ok: false, error: 'Rating must be a number between 1 and 5', request_id: requestId },
        { status: 400 }
      )
    }

    const authorType = isStaffRequest
      ? data.author_type === 'teacher'
        ? 'teacher'
        : 'staff'
      : 'parent'
    const subjectType = data.subject_type
    const visibility = isStaffRequest ? data.visibility ?? 'private' : 'public'
    const audience = isStaffRequest
      ? data.audience ?? (authorType === 'teacher' ? 'family' : 'admin')
      : 'family'

    if (!data.parent_email && (audience !== 'admin' || !isStaffRequest || isFamilyRequest)) {
      return NextResponse.json(
        { ok: false, error: 'Family email is required for this feedback', request_id: requestId },
        { status: 400 }
      )
    }

    if (!isStaffRequest && data.audience === 'admin') {
      return NextResponse.json(
        { ok: false, error: 'Admin feedback requires staff authentication', request_id: requestId },
        { status: 403 }
      )
    }

    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'
    const supabase = supabaseServer()

    const feedbackPayload: Database['public']['Tables']['feedback']['Insert'] = {
      tenant_id: tenantId,
      child_name: childName,
      satisfaction,
      suggestion: message,
      contact_wanted: data.contact_wanted,
      parent_email: data.parent_email ?? null,
      author_type: authorType,
      author_ref_id: data.author_ref_id ?? null,
      subject_type: subjectType,
      subject_ref_id: data.subject_ref_id ?? null,
      visibility,
      audience,
      body: message,
      rating: satisfaction,
      status: data.status,
    }

    const legacyPayload: Database['public']['Tables']['feedback']['Insert'] = {
      tenant_id: tenantId,
      child_name: childName,
      satisfaction,
      suggestion: message,
      contact_wanted: data.contact_wanted,
      parent_email: data.parent_email ?? null,
    }

    const { data: row, error } = await supabase
      .from('feedback')
      .insert(feedbackPayload)
      .select()
      .single()

    if (error) {
      if (isMissingExpandedFeedbackColumn(error)) {
        const { data: legacyRow, error: legacyError } = await supabase
          .from('feedback')
          .insert(legacyPayload)
          .select()
          .single()

        if (legacyError) {
          console.error('[feedback] db error (legacy):', legacyError, { request_id: requestId })
          return NextResponse.json(
            { ok: false, error: 'Failed to create feedback', request_id: requestId },
            { status: 500 }
          )
        }

        const legacyFeedback = legacyRow as Database['public']['Tables']['feedback']['Row']
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
          console.error('[feedback] event error:', eventError)
        }

        return NextResponse.json(
          { ok: true, id: legacyFeedback.id, request_id: requestId },
          { status: 201 }
        )
      }

      console.error('[feedback] db error:', error, { request_id: requestId })
      return NextResponse.json(
        { ok: false, error: 'Failed to create feedback', request_id: requestId },
        { status: 500 }
      )
    }

    const feedback = row as Database['public']['Tables']['feedback']['Row']
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
      console.error('[feedback] event error:', eventError)
    }

    return NextResponse.json(
      { ok: true, id: feedback.id, request_id: requestId },
      { status: 201 }
    )
  } catch (error) {
    console.error('[feedback] unhandled error:', error, { request_id: requestId })
    return NextResponse.json(
      { ok: false, error: 'Internal server error', request_id: requestId },
      { status: 500 }
    )
  }
}
