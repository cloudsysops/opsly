import { NextRequest } from 'next/server'
import { validateFamilyRequest } from '@/lib/family-auth'
import { validateStaffRequest } from '@/lib/staff-auth'
import { isStaffUser } from '@/lib/staff-user'
import { tenantRoleFromUserMetadata } from '@/lib/runtime/tenant-identity'
import {
  buildSubmissionChatContact,
  getSubmissionChatContext,
} from '@/lib/submission-chat'
import { getConversationMessages, storeInboundMessage, storeOutboundMessage } from '@/lib/message-store'
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response'

const MAX_MESSAGE_LENGTH = 1400

function senderNameForFamily(email?: string | null): string {
  return email?.trim() || 'Familia'
}

function senderNameForStaff(role: string | null): string {
  if (role === 'teacher') return 'Profesor'
  if (role === 'support') return 'Soporte'
  return 'Equipo Peskids'
}

async function resolveChatAccess(req: NextRequest, submissionId: string) {
  const tenantSlug = (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim()

  const familyAuth = await validateFamilyRequest(req)
  if (familyAuth.ok) {
    const context = await getSubmissionChatContext(submissionId, tenantSlug)
    if (!context) {
      return { ok: false as const, status: 404, error: 'Conversation not found' }
    }

    const familyEmail = familyAuth.user.email?.trim().toLowerCase() ?? ''
    if (!familyEmail || context.parentEmail !== familyEmail) {
      return { ok: false as const, status: 403, error: 'Forbidden' }
    }

    return { ok: true as const, role: 'family' as const, userEmail: familyEmail, context }
  }

  const staffAuth = await validateStaffRequest(req)
  if (!staffAuth.ok) {
    return { ok: false as const, status: staffAuth.status, error: staffAuth.error }
  }
  if (staffAuth.method !== 'secret' && staffAuth.user && !isStaffUser(staffAuth.user)) {
    return { ok: false as const, status: 403, error: 'Forbidden' }
  }

  const context = await getSubmissionChatContext(submissionId, tenantSlug)
  if (!context) {
    return { ok: false as const, status: 404, error: 'Conversation not found' }
  }

  return {
    ok: true as const,
    role: 'staff' as const,
    staffRole: staffAuth.user ? tenantRoleFromUserMetadata(staffAuth.user) : 'admin',
    userEmail: staffAuth.user?.email ?? null,
    context,
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ submissionId: string }> }
) {
  const requestId = resolveRequestId(req)
  const { submissionId } = await context.params
  const access = await resolveChatAccess(req, submissionId)
  if (!access.ok) {
    return errorJson(requestId, access.error, access.status)
  }

  const messages = await getConversationMessages(access.context.threadContact, 100)

  return successJson(requestId, {
    submission_id: access.context.submissionId,
    student_name: access.context.studentName,
    parent_email: access.context.parentEmail,
    thread_contact: access.context.threadContact,
    can_reply: true,
    viewer_role: access.role,
    messages,
  })
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ submissionId: string }> }
) {
  const requestId = resolveRequestId(req)
  try {
    const { submissionId } = await context.params
    const access = await resolveChatAccess(req, submissionId)
    if (!access.ok) {
      return errorJson(requestId, access.error, access.status)
    }

    const raw = (await req.json()) as { message?: string }
    const messageText = raw.message?.trim() ?? ''
    if (!messageText) {
      return errorJson(requestId, 'Message cannot be empty', 400)
    }
    if (messageText.length > MAX_MESSAGE_LENGTH) {
      return errorJson(requestId, 'Message too long', 400)
    }

    const threadContact = buildSubmissionChatContact(submissionId)

    if (access.role === 'family') {
      const { message, error } = await storeInboundMessage({
        source: 'web',
        sender_contact: threadContact,
        sender_name: senderNameForFamily(access.userEmail),
        message_text: messageText,
        external_id: `family-chat-${submissionId}-${Date.now()}`,
      })

      if (error || !message) {
        return errorJson(requestId, 'Failed to store message', 500)
      }

      return successJson(
        requestId,
        {
          ok: true,
          message_id: message.id,
          viewer_role: access.role,
          thread_contact: threadContact,
          message: 'Mensaje enviado',
        },
        201
      )
    }

    const { message, error } = await storeOutboundMessage({
      parentId: submissionId,
      source: 'web',
      sender_contact: threadContact,
      replyText: messageText,
      aiGenerated: false,
      senderName: senderNameForStaff(access.staffRole ?? null),
      status: 'sent',
    })

    if (error || !message) {
      return errorJson(requestId, 'Failed to store message', 500)
    }

    return successJson(
      requestId,
      {
        ok: true,
        message_id: message.id,
        viewer_role: access.role,
        thread_contact: threadContact,
        message: 'Mensaje enviado',
      },
      201
    )
  } catch (error) {
    console.error('Submission chat API error:', error, { request_id: requestId })
    return errorJson(requestId, 'Internal server error', 500)
  }
}
