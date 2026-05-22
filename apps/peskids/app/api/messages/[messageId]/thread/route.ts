import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest } from '@/lib/admin-auth'
import { supabaseServer } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  const auth = validateAdminRequest(req)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { messageId } = await context.params
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'
  const supabase = supabaseServer()

  const { data: inbound, error: inboundError } = await supabase
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (inboundError || !inbound) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  }

  const { data: drafts } = await supabase
    .from('messages')
    .select('id, message_text, created_at, ai_generated, status')
    .eq('tenant_id', tenantId)
    .eq('parent_message_id', messageId)
    .eq('direction', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)

  const latestDraft = drafts?.[0] ?? null

  return NextResponse.json({
    inbound,
    suggested_reply: latestDraft?.message_text ?? null,
    draft_id: latestDraft?.id ?? null,
  })
}
