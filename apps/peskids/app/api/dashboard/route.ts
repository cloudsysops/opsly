import { NextRequest, NextResponse } from 'next/server'
import { validateStaffRequest } from '@/lib/staff-auth'
import { supabaseServer, getRecentMessages } from '@/lib/supabase'
import type { Database, DashboardData } from '@/lib/types'

export const dynamic = 'force-dynamic'

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

export async function GET(req: NextRequest) {
  try {
    const auth = await validateStaffRequest(req)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const rangeParam = req.nextUrl.searchParams.get('range')
    const range = rangeParam === 'month' ? 'month' : 'week'
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'
    const supabase = supabaseServer()

    const today = new Date()
    const dayOfWeek = today.getDay()
    const periodStart = new Date(today)
    if (range === 'month') {
      periodStart.setDate(1)
    } else {
      periodStart.setDate(today.getDate() - dayOfWeek)
    }
    periodStart.setHours(0, 0, 0, 0)
    const periodStartISO = periodStart.toISOString()

    // Fetch new leads in the selected period
    const { data: newLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, email, phone, class_modality, neighborhood, grade_interested, status, admin_notes')
      .eq('tenant_id', tenantId)
      .gte('created_at', periodStartISO)
      .order('created_at', { ascending: false })

    if (leadsError) throw leadsError

    // Fetch active students
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, grade, status')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')

    if (studentsError) throw studentsError

    // Count students by grade
    const studentsByGrade: Record<string, number> = {}
    const typedStudents = students as Array<Pick<Database['public']['Tables']['students']['Row'], 'grade'>>
    typedStudents?.forEach(student => {
      studentsByGrade[student.grade] = (studentsByGrade[student.grade] || 0) + 1
    })

    let recentFeedback: DashboardData['recent_feedback'] | null = null
    let privateFamilyNotes: DashboardData['private_family_notes'] | null = null
    let feedbackError: { message?: string } | null = null

    const feedbackQuery = async () =>
      supabase
        .from('feedback')
        .select(
          'id, child_name, satisfaction, suggestion, author_type, subject_type, visibility, audience, parent_email, body, rating, status, created_at'
        )
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(20)

    const feedbackResult = await feedbackQuery()
    const recentFeedbackRows = (feedbackResult.data ?? []) as Array<
      DashboardData['recent_feedback'][number] & { created_at?: string }
    >
    feedbackError = feedbackResult.error

    if (!feedbackError) {
      recentFeedback = recentFeedbackRows
        .filter((feedback) => feedback.visibility !== 'private')
        .slice(0, 5) as DashboardData['recent_feedback']
      privateFamilyNotes = recentFeedbackRows
        .filter((feedback) => feedback.visibility === 'private' && feedback.audience === 'family')
        .slice(0, 5) as DashboardData['private_family_notes']
    }

    if (feedbackError && isMissingExpandedFeedbackColumn(feedbackError)) {
      const fallback = await supabase
        .from('feedback')
        .select('id, child_name, satisfaction, suggestion')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5)
      recentFeedback = fallback.data as unknown as DashboardData['recent_feedback']
      feedbackError = fallback.error
      privateFamilyNotes = []
    }

    if (feedbackError) throw feedbackError

    // Fetch followups
    const { data: followups, error: followupsError } = await supabase
      .from('followups')
      .select('id, contact_id, contact_type, due_date, type, status, notes')
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: true })

    if (followupsError) throw followupsError

    const pendingFollowups = (followups ?? []).filter((followup) => followup.status === 'pending')

    // Fetch recent inbound messages (WhatsApp, Instagram, etc.)
    const recentMessages = await getRecentMessages(tenantId, 10)

    const dashboardData: DashboardData = {
      new_leads_count: newLeads?.length || 0,
      new_leads: (newLeads as unknown as DashboardData['new_leads']) || [],
      active_students_count: students?.length || 0,
      students_by_grade: studentsByGrade,
      recent_feedback:
        (recentFeedback as unknown as DashboardData['recent_feedback']) || [],
      private_family_notes:
        (privateFamilyNotes as unknown as DashboardData['private_family_notes']) || [],
      pending_followups_count: pendingFollowups?.length || 0,
      pending_followups: (pendingFollowups as DashboardData['pending_followups']) || [],
      followups: (followups as DashboardData['followups']) || [],
      recent_messages: (recentMessages as DashboardData['recent_messages']) || [],
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
