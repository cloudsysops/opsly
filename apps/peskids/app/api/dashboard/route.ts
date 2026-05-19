import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { DashboardData } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'
    const supabase = supabaseServer()

    // Get this week's start date
    const today = new Date()
    const dayOfWeek = today.getDay()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - dayOfWeek)
    weekStart.setHours(0, 0, 0, 0)
    const weekStartISO = weekStart.toISOString()

    // Fetch new leads this week
    const { data: newLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, email, phone, grade_interested')
      .eq('tenant_id', tenantId)
      .gte('created_at', weekStartISO)
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
    students?.forEach(student => {
      studentsByGrade[student.grade] = (studentsByGrade[student.grade] || 0) + 1
    })

    // Fetch recent feedback
    const { data: recentFeedback, error: feedbackError } = await supabase
      .from('feedback')
      .select('id, child_name, satisfaction, suggestion')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (feedbackError) throw feedbackError

    // Fetch pending followups
    const { data: pendingFollowups, error: followupsError } = await supabase
      .from('followups')
      .select('id, contact_id, due_date, type')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('due_date', { ascending: true })

    if (followupsError) throw followupsError

    const dashboardData: DashboardData = {
      new_leads_count: newLeads?.length || 0,
      new_leads: newLeads || [],
      active_students_count: students?.length || 0,
      students_by_grade: studentsByGrade,
      recent_feedback: recentFeedback || [],
      pending_followups_count: pendingFollowups?.length || 0,
      pending_followups: pendingFollowups || [],
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
