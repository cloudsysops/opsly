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

export type ImprovementMessageRow =
  Database['public']['Tables']['staff_improvement_messages']['Row'];

function tenantId(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

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

  const analysis = await analyzeImprovementMessage(analysisPrompt);

  let twentyTaskId: string | null = null;
  if (analysis.actionable && isPeskidsStaffImprovementChatTwentyTaskEnabled()) {
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
