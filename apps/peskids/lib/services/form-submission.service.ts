import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRole) {
    return null
  }

  return createClient(url, serviceRole)
}

export interface FormSubmissionSummary {
  formId: string
  formTitle: string
  submissionId: string
  submittedAt: string
  status: 'completed' | 'pending' | 'reviewed'
}

export interface StudentSubmission {
  submissionId: string
  studentName: string
  studentId: string
  formTitle: string
  submittedAt: string
  grade?: number
  maxGrade: number
  feedback?: string
  status: 'reviewed' | 'pending' | 'needs_revision'
}

export class FormSubmissionService {
  private tenantSlug = 'peskids'

  async getParentSubmissions(): Promise<FormSubmissionSummary[]> {
    const supabase = getSupabaseClient()
    if (!supabase) return []

    const { data, error } = await supabase
      .from('form_submissions')
      .select(
        `
        submission_id,
        completed_at,
        status,
        form_id,
        form:form_id(title)
      `
      )
      .eq('tenant_slug', this.tenantSlug)
      .not('user_id', 'is', null)
      .order('completed_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch parent submissions:', error)
      return []
    }

    return (data || []).map((row: any) => ({
      formId: row.form_id,
      formTitle: row.form?.title || 'Untitled Form',
      submissionId: row.submission_id,
      submittedAt: row.completed_at || new Date().toISOString(),
      status: row.status === 'graded' ? 'reviewed' : row.status === 'submitted' ? 'completed' : 'pending',
    }))
  }

  async getTeacherSubmissions(): Promise<StudentSubmission[]> {
    const supabase = getSupabaseClient()
    if (!supabase) return []

    const { data, error } = await supabase
      .from('form_submissions')
      .select(
        `
        submission_id,
        user_id,
        form_data,
        score,
        feedback,
        status,
        completed_at,
        form:form_id(title)
      `
      )
      .eq('tenant_slug', this.tenantSlug)
      .order('completed_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch teacher submissions:', error)
      return []
    }

    return (data || []).map((row: any) => ({
      submissionId: row.submission_id,
      studentName: row.form_data?.student_name || 'Unknown Student',
      studentId: row.user_id || `std-${Math.random().toString(36).substr(2, 9)}`,
      formTitle: row.form?.title || 'Untitled Form',
      submittedAt: row.completed_at || new Date().toISOString(),
      grade: row.score,
      maxGrade: 100,
      feedback: row.feedback,
      status: row.status === 'graded' ? 'reviewed' : row.status === 'submitted' ? 'pending' : 'needs_revision',
    }))
  }

  async getFormAnalytics(): Promise<{
    formId: string
    formTitle: string
    submissionsCount: number
    abandonmentRate: number
    avgCompletionTime: number
    errorCount: number
  }[]> {
    const supabase = getSupabaseClient()
    if (!supabase) return []

    const { data: forms, error: formsError } = await supabase
      .from('forms')
      .select('id, title')
      .eq('tenant_slug', this.tenantSlug)

    if (formsError) {
      console.error('Failed to fetch forms:', formsError)
      return []
    }

    const { data: submissions, error: submissionsError } = await supabase
      .from('form_submissions')
      .select('form_id, status, started_at, completed_at')
      .eq('tenant_slug', this.tenantSlug)

    if (submissionsError) {
      console.error('Failed to fetch submissions:', submissionsError)
      return []
    }

    return (forms || []).map((form: any) => {
      const formSubmissions = (submissions || []).filter((s: any) => s.form_id === form.id)
      const completed = formSubmissions.filter((s: any) => s.status === 'submitted' || s.status === 'graded')
      const started = formSubmissions.filter((s: any) => s.status === 'started')

      const completionTimes = completed
        .filter((s: any) => s.started_at && s.completed_at)
        .map((s: any) => {
          const start = new Date(s.started_at).getTime()
          const end = new Date(s.completed_at).getTime()
          return (end - start) / 1000 / 60 // minutes
        })

      const avgCompletionTime = completionTimes.length > 0 ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length) : 0
      const abandonmentRate = started.length > 0 ? Math.round((started.length / (started.length + completed.length)) * 100) : 0

      return {
        formId: form.id,
        formTitle: form.title,
        submissionsCount: completed.length,
        abandonmentRate,
        avgCompletionTime,
        errorCount: 0, // TODO: track validation errors
      }
    })
  }
}

export const createFormSubmissionService = () => new FormSubmissionService()
