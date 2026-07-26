import { TwentyClient, resolveTwentyEnv } from '@intcloudsysops/services/twenty';
import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import {
  analyzeImprovementMessage,
  type ImprovementCategory,
  type ImprovementPriority,
} from '@/lib/improvement-chat-assistant';
import {
  isPeskidsStaffImprovementChatTwentyTaskEnabled,
} from '@/lib/peskids-pro-flags';
import {
  buildAgentTicket,
  canApproveChangeRequest,
  canTransitionChangeRequestStatus,
  isChangeRequestStatus,
  type AgentTicket,
  type ChangeRequestStatus,
} from '@/lib/change-request-ticket';
import type { PatchChangeRequestInput } from '@/lib/validation/improvement-chat.schema';

export type ImprovementMessageRow =
  Database['public']['Tables']['staff_improvement_messages']['Row'];

function tenantId(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

export type ListChangeRequestsFilters = {
  status?: ChangeRequestStatus;
  priority?: ImprovementPriority;
  category?: ImprovementCategory;
};

/**
 * Lists staff change requests (role=staff) with optional filters.
 * Assistant chat rows are excluded from the intake queue.
 */
export async function listChangeRequests(
  filters: ListChangeRequestsFilters = {}
): Promise<ImprovementMessageRow[]> {
  let query = supabaseServer()
    .from('staff_improvement_messages')
    .select('*')
    .eq('tenant_id', tenantId())
    .eq('role', 'staff')
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Full chat transcript (staff + assistant) for the floating chat UI. */
export async function listImprovementMessages(): Promise<ImprovementMessageRow[]> {
  const { data, error } = await supabaseServer()
    .from('staff_improvement_messages')
    .select('*')
    .eq('tenant_id', tenantId())
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function insertMessage(
  input: Database['public']['Tables']['staff_improvement_messages']['Insert']
): Promise<ImprovementMessageRow> {
  const { data, error } = await supabaseServer()
    .from('staff_improvement_messages')
    .insert({ tenant_id: tenantId(), ...input })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

const TASK_CATEGORY_LABEL: Record<ImprovementCategory, string> = {
  bug: 'Bug',
  feature: 'Nueva funcionalidad',
  improvement: 'Mejora',
  security: 'Seguridad',
  billing: 'Facturación',
  question: 'Pregunta',
  other: 'Otro',
};

const TASK_PRIORITY_DAYS: Record<ImprovementPriority, number> = {
  alta: 1,
  media: 3,
  baja: 7,
};

/** Best-effort — a Twenty failure never blocks the chat from responding. */
async function createTwentyTaskForImprovement(input: {
  category: ImprovementCategory;
  priority: ImprovementPriority;
  summary: string;
  body: string;
}): Promise<string | null> {
  try {
    const env = resolveTwentyEnv();
    if (!env.enabled) return null;

    const client = new TwentyClient(env.apiKey, env.baseUrl);
    const due = new Date();
    due.setDate(due.getDate() + TASK_PRIORITY_DAYS[input.priority]);

    const task = await client.createTask({
      title: `[Peskids] ${TASK_CATEGORY_LABEL[input.category]} — ${input.summary}`.slice(0, 200),
      body: `${input.summary}\n\n---\nMensaje original del equipo Peskids:\n${input.body}`,
      dueAt: due.toISOString(),
      status: 'TODO',
    });

    return task.id;
  } catch (err) {
    console.warn('[improvement-chat] Failed to create Twenty task:', err);
    return null;
  }
}

export type ImprovementAttachment = {
  name: string;
  mime_type: string;
  size_bytes: number;
  storage_path?: string | null;
  content_base64?: string | null;
};

async function persistAttachments(
  authorEmail: string | null,
  attachments: ImprovementAttachment[]
): Promise<ImprovementAttachment[]> {
  if (attachments.length === 0) return [];

  const admin = supabaseServer();
  const saved: ImprovementAttachment[] = [];

  for (const file of attachments) {
    const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(0, 120);
    const path = `${tenantId()}/${Date.now()}-${safeName}`;
    try {
      const binary = Buffer.from(file.content_base64 ?? '', 'base64');
      const { error } = await admin.storage
        .from('peskids-staff-uploads')
        .upload(path, binary, { contentType: file.mime_type, upsert: false });
      if (error) throw error;
      saved.push({
        name: file.name,
        mime_type: file.mime_type,
        size_bytes: file.size_bytes,
        storage_path: path,
        content_base64: null,
      });
    } catch (err) {
      console.warn('[improvement-chat] storage upload failed; keeping inline payload', {
        name: file.name,
        authorEmail,
        error: err instanceof Error ? err.message : String(err),
      });
      // Keep a truncated inline copy so Opsly still sees the sample if Storage bucket
      // is not applied yet (migration pending).
      saved.push({
        name: file.name,
        mime_type: file.mime_type,
        size_bytes: file.size_bytes,
        storage_path: null,
        content_base64: (file.content_base64 ?? '').slice(0, 1_200_000) || null,
      });
    }
  }

  return saved;
}

/**
 * Staff message → AI classify/summarize ONLY → optional Twenty task (best-effort).
 * Does NOT execute code, WhatsApp, deploy, or any side-effect beyond DB + CRM task create.
 */
export async function createStaffMessageAndAnalyze(input: {
  body: string;
  authorEmail: string | null;
  attachments?: ImprovementAttachment[];
}): Promise<{ staffMessage: ImprovementMessageRow; assistantMessage: ImprovementMessageRow }> {
  const attachments = await persistAttachments(input.authorEmail, input.attachments ?? []);
  const body =
    input.body.trim().length >= 3
      ? input.body.trim()
      : attachments.length > 0
        ? `Adjunto ${attachments.length} archivo(s) para revisión de Opsly (cambios / muestra de chat / base de datos).`
        : input.body.trim();

  const staffMessage = await insertMessage({
    role: 'staff',
    author_email: input.authorEmail,
    body,
    attachments,
    status: 'new',
  });

  const analysisPrompt =
    attachments.length > 0
      ? `${body}\n\n[El mensaje incluye ${attachments.length} adjunto(s): ${attachments
          .map((a) => `${a.name} (${a.mime_type})`)
          .join(', ')}. Pueden ser capturas de chat con familias, PDF o evidencias de cambios.]`
      : body;

  // AI analyze only — never execute the request.
  const analysis = await analyzeImprovementMessage(analysisPrompt);

  let twentyTaskId: string | null = null;
  if (analysis.actionable && isPeskidsStaffImprovementChatTwentyTaskEnabled()) {
    // Best-effort CRM mirror; failure must not block chat reply.
    twentyTaskId = await createTwentyTaskForImprovement({
      category: analysis.category,
      priority: analysis.priority,
      summary: analysis.summary,
      body: analysisPrompt,
    });
  }

  const { data: updatedStaffMessage, error: updateError } = await supabaseServer()
    .from('staff_improvement_messages')
    .update({
      category: analysis.category,
      priority: analysis.priority,
      ai_summary: analysis.summary,
      twenty_task_id: twentyTaskId,
      status: twentyTaskId ? 'task_created' : 'analyzed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', staffMessage.id)
    .select('*')
    .single();

  if (updateError) throw updateError;

  const assistantMessage = await insertMessage({
    role: 'assistant',
    author_email: null,
    body: analysis.reply,
    status: 'analyzed',
  });

  return { staffMessage: updatedStaffMessage, assistantMessage };
}

export type PatchChangeRequestResult =
  | { ok: true; message: ImprovementMessageRow }
  | { ok: false; error: 'not_found' | 'invalid_transition' | 'not_staff' };

/**
 * Operator PATCH: status / notes / PR / issue links only.
 * Never triggers deploy, WhatsApp, or agent execution.
 */
export async function patchChangeRequest(
  id: string,
  input: PatchChangeRequestInput
): Promise<PatchChangeRequestResult> {
  const { data: existing, error: loadError } = await supabaseServer()
    .from('staff_improvement_messages')
    .select('*')
    .eq('tenant_id', tenantId())
    .eq('id', id)
    .maybeSingle();

  if (loadError) throw loadError;
  if (!existing) return { ok: false, error: 'not_found' };
  if (existing.role !== 'staff') return { ok: false, error: 'not_staff' };

  if (input.status !== undefined) {
    if (!isChangeRequestStatus(existing.status)) {
      return { ok: false, error: 'invalid_transition' };
    }
    if (!canTransitionChangeRequestStatus(existing.status, input.status)) {
      return { ok: false, error: 'invalid_transition' };
    }
  }

  const updates: Database['public']['Tables']['staff_improvement_messages']['Update'] = {
    updated_at: new Date().toISOString(),
  };
  if (input.status !== undefined) updates.status = input.status;
  if (input.operator_notes !== undefined) updates.operator_notes = input.operator_notes;
  if (input.linked_pr !== undefined) updates.linked_pr = input.linked_pr;
  if (input.linked_issue !== undefined) updates.linked_issue = input.linked_issue;

  const { data: updated, error: updateError } = await supabaseServer()
    .from('staff_improvement_messages')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId())
    .select('*')
    .single();

  if (updateError) throw updateError;
  return { ok: true, message: updated };
}

export type ApproveChangeRequestResult =
  | { ok: true; message: ImprovementMessageRow; agentTicket: AgentTicket }
  | { ok: false; error: 'not_found' | 'not_staff' | 'not_approvable' };

/**
 * Human approval: set status=approved and persist agent_ticket JSON.
 * Does NOT execute the ticket — payload is for a later agent session only.
 */
export async function approveChangeRequest(
  id: string,
  options: { operatorNotes?: string | null } = {}
): Promise<ApproveChangeRequestResult> {
  const { data: existing, error: loadError } = await supabaseServer()
    .from('staff_improvement_messages')
    .select('*')
    .eq('tenant_id', tenantId())
    .eq('id', id)
    .maybeSingle();

  if (loadError) throw loadError;
  if (!existing) return { ok: false, error: 'not_found' };
  if (existing.role !== 'staff') return { ok: false, error: 'not_staff' };
  if (!isChangeRequestStatus(existing.status) || !canApproveChangeRequest(existing.status)) {
    return { ok: false, error: 'not_approvable' };
  }

  const operatorNotes =
    options.operatorNotes !== undefined ? options.operatorNotes : existing.operator_notes;

  const agentTicket = buildAgentTicket({
    messageId: existing.id,
    tenantId: existing.tenant_id,
    requestedBy: existing.author_email,
    category: existing.category,
    priority: existing.priority,
    summary: existing.ai_summary,
    body: existing.body,
    aiSummary: existing.ai_summary,
    twentyTaskId: existing.twenty_task_id,
    operatorNotes,
  });

  const { data: updated, error: updateError } = await supabaseServer()
    .from('staff_improvement_messages')
    .update({
      status: 'approved',
      operator_notes: operatorNotes,
      agent_ticket: agentTicket as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId())
    .select('*')
    .single();

  if (updateError) throw updateError;
  return { ok: true, message: updated, agentTicket };
}
