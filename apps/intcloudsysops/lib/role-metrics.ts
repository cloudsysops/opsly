import { supabaseServer } from '@/lib/supabase'
import type { StudentSubmission } from '@/lib/services/form-submission.service'
import { buildSubmissionChatContact } from '@/lib/submission-chat'

function tenantId(): string {
  return process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'
}

function uniqueCount(values: Array<string | null | undefined>): number {
  return new Set(values.map((value) => value?.trim()).filter(Boolean)).size
}

async function getMessagesForThreads(threadContacts: string[]) {
  if (threadContacts.length === 0) return []

  const supabase = supabaseServer()
  const { data, error } = await supabase
    .from('messages')
    .select('sender_contact, sender_name, direction, created_at, status')
    .eq('tenant_id', tenantId())
    .in('sender_contact', threadContacts)
    .order('created_at', { ascending: false })

  if (error) {
    return []
  }

  return data ?? []
}

export interface FamilyRoleMetrics {
  totalSubmissions: number
  reviewedSubmissions: number
  pendingSubmissions: number
  averageSatisfaction: number
  privateNotesCount: number
  activeChatThreads: number
  recentMessages: number
  latestActivityAt: string | null
}

export interface TeacherRoleMetrics {
  totalSubmissions: number
  reviewedCount: number
  pendingCount: number
  needsRevisionCount: number
  uniqueStudents: number
  uniqueFamilies: number
  averageGrade: number
  averageProgress: number
  activeChatThreads: number
  recentFamilyMessages: number
  latestActivityAt: string | null
}

export async function buildFamilyRoleMetrics(
  submissions: Array<{ submissionId: string; submittedAt: string; status: string }>,
  feedbackRows: Array<{ visibility: string; audience: string; satisfaction?: number | null; created_at?: string }>
): Promise<FamilyRoleMetrics> {
  const threadContacts = submissions.map((submission) => buildSubmissionChatContact(submission.submissionId))
  const messages = await getMessagesForThreads(threadContacts)
  const latestActivityAt = [...submissions.map((row) => row.submittedAt), ...messages.map((row) => row.created_at), ...feedbackRows.map((row) => row.created_at ?? null)]
    .filter(Boolean)
    .sort()
    .at(-1) ?? null

  const privateNotesCount = feedbackRows.filter((row) => row.visibility === 'private' && row.audience === 'family').length
  const reviewedSubmissions = submissions.filter((submission) => submission.status === 'reviewed').length
  const pendingSubmissions = submissions.filter((submission) => submission.status === 'pending').length
  const averageSatisfactionSource = feedbackRows
    .map((row) => row.satisfaction)
    .filter((value): value is number => typeof value === 'number')

  return {
    totalSubmissions: submissions.length,
    reviewedSubmissions,
    pendingSubmissions,
    averageSatisfaction:
      averageSatisfactionSource.length > 0
        ? Math.round(
            averageSatisfactionSource.reduce((sum, value) => sum + value, 0) / averageSatisfactionSource.length
          )
        : 0,
    privateNotesCount,
    activeChatThreads: uniqueCount(messages.map((row: any) => row.sender_contact)),
    recentMessages: messages.filter((row: any) => row.direction !== 'draft').length,
    latestActivityAt,
  }
}

export async function buildTeacherRoleMetrics(submissions: StudentSubmission[]): Promise<TeacherRoleMetrics> {
  const threadContacts = submissions.map((submission) => buildSubmissionChatContact(submission.submissionId))
  const messages = await getMessagesForThreads(threadContacts)
  const latestActivityAt = [...submissions.map((row) => row.submittedAt), ...messages.map((row) => row.created_at)]
    .filter(Boolean)
    .sort()
    .at(-1) ?? null

  const reviewedCount = submissions.filter((submission) => submission.status === 'reviewed').length
  const pendingCount = submissions.filter((submission) => submission.status === 'pending').length
  const needsRevisionCount = submissions.filter((submission) => submission.status === 'needs_revision').length
  const averageGradeSource = submissions
    .map((submission) => submission.grade)
    .filter((value): value is number => typeof value === 'number')
  const averageProgressSource = submissions
    .map((submission) => submission.progressPercent)
    .filter((value): value is number => typeof value === 'number')

  return {
    totalSubmissions: submissions.length,
    reviewedCount,
    pendingCount,
    needsRevisionCount,
    uniqueStudents: uniqueCount(submissions.map((submission) => submission.studentId)),
    uniqueFamilies: uniqueCount(submissions.map((submission) => submission.parentEmail)),
    averageGrade:
      averageGradeSource.length > 0
        ? Math.round(averageGradeSource.reduce((sum, value) => sum + value, 0) / averageGradeSource.length)
        : 0,
    averageProgress:
      averageProgressSource.length > 0
        ? Math.round(averageProgressSource.reduce((sum, value) => sum + value, 0) / averageProgressSource.length)
        : 0,
    activeChatThreads: uniqueCount(messages.map((row: any) => row.sender_contact)),
    recentFamilyMessages: messages.filter((row: any) => row.direction === 'inbound').length,
    latestActivityAt,
  }
}
