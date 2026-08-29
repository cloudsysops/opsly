import type { NextRequest } from 'next/server';
import { executeAutoImplement } from '@intcloudsysops/ml';
import { sanitizeImplementationPrompt } from '@intcloudsysops/prompt-guard';
import { notifyDiscordFeedback } from '../feedback-notify';
import { extractIp, logAuditEvent } from '../audit';
import { requireAdminAccess } from '../auth';
import { HTTP_STATUS } from '../constants';
import { checkRateLimit } from '../rate-limiter';
import { getServiceClient } from '../supabase';

type DecisionRow = {
  id: string;
  conversation_id: string;
  implementation_prompt: string | null;
  feedback_conversations: { tenant_slug: string } | { tenant_slug: string }[] | null;
};

function tenantSlugFromDecision(row: DecisionRow): string {
  const rel = row.feedback_conversations;
  if (Array.isArray(rel)) {
    return rel[0]?.tenant_slug ?? 'platform';
  }
  return rel?.tenant_slug ?? 'platform';
}

async function parseApproveBody(
  req: NextRequest
): Promise<Response | { decision_id: string; approved: boolean }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: HTTP_STATUS.BAD_REQUEST });
  }
  if (body === null || typeof body !== 'object') {
    return Response.json({ error: 'Cuerpo inválido' }, { status: HTTP_STATUS.BAD_REQUEST });
  }
  const b = body as Record<string, unknown>;
  const decision_id = typeof b.decision_id === 'string' ? b.decision_id : '';
  const approved = b.approved === true;
  if (!decision_id) {
    return Response.json({ error: 'decision_id requerido' }, { status: HTTP_STATUS.BAD_REQUEST });
  }
  return { decision_id, approved };
}

export async function handleFeedbackApprove(req: NextRequest): Promise<Response> {
  const unauthorized = await requireAdminAccess(req);
  if (unauthorized) return unauthorized;

  const ip = extractIp(req);
  const rateLimit = await checkRateLimit(
    ip ? `feedback-approve:${ip}` : 'feedback-approve:anonymous'
  );
  if (!rateLimit.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: HTTP_STATUS.TOO_MANY_REQUESTS });
  }

  const parsed = await parseApproveBody(req);
  if (parsed instanceof Response) return parsed;

  const { decision_id, approved } = parsed;

  const supabase = getServiceClient();

  const { data: decision, error: decErr } = await supabase
    .schema('platform')
    .from('feedback_decisions')
    .select('id, conversation_id, implementation_prompt, feedback_conversations(tenant_slug)')
    .eq('id', decision_id)
    .single();

  if (decErr || !decision || typeof decision !== 'object') {
    return Response.json({ error: 'Decisión no encontrada' }, { status: HTTP_STATUS.NOT_FOUND });
  }

  const row = decision as DecisionRow;
  const tenantSlug = tenantSlugFromDecision(row);

  if (approved) {
    await approveFlow(supabase, decision_id, row);
  } else {
    await rejectFlow(supabase, decision_id, row.conversation_id);
  }

  void logAuditEvent({
    tenant_slug: tenantSlug,
    action: approved ? 'feedback_approve' : 'feedback_reject',
    resource: `feedback_decision:${decision_id}`,
    ip,
    user_agent: req.headers.get('user-agent') ?? undefined,
    metadata: {
      decision_id,
      conversation_id: row.conversation_id,
      approved,
    },
  });

  return Response.json({ success: true, approved });
}

async function approveFlow(
  supabase: ReturnType<typeof getServiceClient>,
  decision_id: string,
  row: DecisionRow
): Promise<void> {
  await supabase
    .schema('platform')
    .from('feedback_decisions')
    .update({
      approved_by: 'admin',
      approved_at: new Date().toISOString(),
    })
    .eq('id', decision_id);

  await supabase
    .schema('platform')
    .from('feedback_conversations')
    .update({
      status: 'implementing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.conversation_id);

  const slug = tenantSlugFromDecision(row);
  const rawPrompt =
    row.implementation_prompt ?? 'Implementar feedback aprobado (describir cambio en Markdown).';
  const sanitized = sanitizeImplementationPrompt(rawPrompt);
  if (!sanitized.ok) {
    await notifyDiscordFeedback(
      '⚠️ implementation_prompt bloqueado',
      `Decision ID: ${decision_id}\nViolaciones: ${sanitized.violations.join(', ')}`,
      'warning'
    );
    return;
  }

  await executeAutoImplement(decision_id, sanitized.sanitized, slug);

  await notifyDiscordFeedback(
    '✅ Feedback aprobado — enviado a Cursor',
    `Decision ID: ${decision_id}`,
    'success'
  );
}

async function rejectFlow(
  supabase: ReturnType<typeof getServiceClient>,
  decision_id: string,
  conversation_id: string
): Promise<void> {
  await supabase
    .schema('platform')
    .from('feedback_decisions')
    .update({ decision_type: 'rejected' })
    .eq('id', decision_id);

  await supabase
    .schema('platform')
    .from('feedback_conversations')
    .update({
      status: 'rejected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversation_id);
}
