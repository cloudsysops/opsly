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

export async function createStaffMessageAndAnalyze(input: {
  body: string;
  authorEmail: string | null;
}): Promise<{ staffMessage: ImprovementMessageRow; assistantMessage: ImprovementMessageRow }> {
  const staffMessage = await insertMessage({
    role: 'staff',
    author_email: input.authorEmail,
    body: input.body,
    status: 'new',
  });

  const analysis = await analyzeImprovementMessage(input.body);

  let twentyTaskId: string | null = null;
  if (analysis.actionable && isPeskidsStaffImprovementChatTwentyTaskEnabled()) {
    twentyTaskId = await createTwentyTaskForImprovement({
      category: analysis.category,
      priority: analysis.priority,
      summary: analysis.summary,
      body: input.body,
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
