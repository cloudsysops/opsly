import { supabaseServer } from '@/lib/supabase'

const THREAD_PREFIX = 'submission-chat:'

export type SubmissionChatMessage = {
  id: string
  message_text: string
  created_at: string
  direction: 'inbound' | 'draft' | 'outbound'
  sender_name: string | null
  sender_contact: string
  status: 'pending' | 'approved' | 'sent' | null
}

export type SubmissionChatContext = {
  submissionId: string
  studentName: string
  parentEmail: string
  threadContact: string
}

function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function extractParentEmail(row: any): string {
  const directEmail =
    row?.parent_email ||
    row?.form_data?.parent_email ||
    row?.form_data?.family_email ||
    row?.form_data?.email ||
    row?.form_data?.guardian_email ||
    null

  return normalizeEmail(directEmail)
}

function extractStudentName(row: any): string {
  return (
    row?.form_data?.student_name ||
    row?.form_data?.child_name ||
    row?.form_data?.name ||
    row?.form?.title ||
    'Entrega'
  )
}

export function buildSubmissionChatContact(submissionId: string): string {
  return `${THREAD_PREFIX}${submissionId.trim()}`
}

export async function getSubmissionChatContext(
  submissionId: string,
  tenantSlug: string
): Promise<SubmissionChatContext | null> {
  const supabase = supabaseServer()
  const { data, error } = await supabase
    .from('form_submissions')
    .select(
      `
      submission_id,
      parent_email,
      form_data,
      form_id,
      form:form_id(title)
    `
    )
    .eq('tenant_slug', tenantSlug)
    .eq('submission_id', submissionId)
    .maybeSingle()

  if (error || !data) return null

  const parentEmail = extractParentEmail(data)
  if (!parentEmail) return null

  return {
    submissionId,
    studentName: extractStudentName(data),
    parentEmail,
    threadContact: buildSubmissionChatContact(submissionId),
  }
}

export function isSubmissionChatThread(senderContact: string, submissionId: string): boolean {
  return senderContact === buildSubmissionChatContact(submissionId)
}

export function submissionChatDisplayName(role: 'family' | 'teacher', userEmail?: string | null): string {
  if (role === 'family') {
    return userEmail?.trim() || 'Familia'
  }

  return 'Profesor'
}
