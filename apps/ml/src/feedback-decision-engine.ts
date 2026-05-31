/**
 * ML Decision Engine — clasifica feedback y persiste decisión en Supabase.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { llmCall } from '@intcloudsysops/llm-gateway';
import {
  FEEDBACK_ANALYSIS_SYSTEM_PROMPT,
  buildFeedbackAnalysisUserPayload,
  detectPromptInjection,
  guardChatOutput,
  sanitizeImplementationPrompt,
  wrapConversationHistory,
  type ChatTurn,
} from '@intcloudsysops/prompt-guard';
import { writeActivePrompt } from './write-active-prompt.js';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

let supabaseSingleton: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseSingleton) {
    supabaseSingleton = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );
  }
  return supabaseSingleton;
}

export interface FeedbackInput {
  conversation_id: string;
  tenant_slug: string;
  user_email: string;
  messages: Array<{ role: string; content: string }>;
}

export type DecisionType = 'auto_implement' | 'needs_approval' | 'rejected' | 'scheduled';
export type Criticality = 'low' | 'medium' | 'high' | 'critical';

export interface DecisionOutput {
  decision_type: DecisionType;
  criticality: Criticality;
  reasoning: string;
  implementation_prompt?: string;
  user_response: string;
  notify_discord: boolean;
}

const AUTO_IMPLEMENT_RULES = [
  'typo en texto de UI',
  'color o estilo visual menor',
  'texto de botón confuso',
  'mensaje de error poco claro',
  'falta traducción',
  'link roto en documentación',
];

const NEEDS_APPROVAL_RULES = [
  'nueva funcionalidad',
  'cambio de flujo de usuario',
  'cambio en lógica de negocio',
  'cambio en pricing o planes',
  'integración con servicio externo',
  'cambio en permisos o seguridad',
];

const CRITICAL_RULES = [
  'vulnerabilidad de seguridad',
  'pérdida de datos',
  'falla en producción',
  'error en facturación',
  'tenant no puede acceder',
];

function isDecisionType(v: unknown): v is DecisionType {
  return v === 'auto_implement' || v === 'needs_approval' || v === 'rejected' || v === 'scheduled';
}

function isCriticality(v: unknown): v is Criticality {
  return v === 'low' || v === 'medium' || v === 'high' || v === 'critical';
}

function conversationStatusForDecision(d: DecisionType): string {
  switch (d) {
    case 'auto_implement':
      return 'implementing';
    case 'needs_approval':
      return 'pending_approval';
    case 'rejected':
      return 'rejected';
    case 'scheduled':
      return 'analyzing';
    default:
      return 'open';
  }
}

function parseDecisionFromLlm(content: string): Omit<DecisionOutput, 'notify_discord'> {
  const clean = content.replace(/```json|```/g, '').trim();
  let raw: unknown;
  try {
    raw = JSON.parse(clean) as unknown;
  } catch {
    return {
      decision_type: 'needs_approval',
      criticality: 'medium',
      reasoning: 'No se pudo analizar automáticamente',
      user_response: 'Gracias por tu feedback. Lo revisaremos pronto.',
    };
  }
  if (raw === null || typeof raw !== 'object') {
    return {
      decision_type: 'needs_approval',
      criticality: 'medium',
      reasoning: 'Respuesta ML inválida',
      user_response: 'Gracias por tu feedback. Lo revisaremos pronto.',
    };
  }
  const o = raw as Record<string, unknown>;
  const decision_type = isDecisionType(o.decision_type) ? o.decision_type : 'needs_approval';
  const criticality = isCriticality(o.criticality) ? o.criticality : 'medium';
  const reasoning = typeof o.reasoning === 'string' ? o.reasoning : 'Sin razonamiento';
  const implementation_prompt =
    typeof o.implementation_prompt === 'string' ? o.implementation_prompt : undefined;
  const user_response =
    typeof o.user_response === 'string'
      ? o.user_response
      : 'Gracias por tu feedback. Lo revisaremos pronto.';

  let out: Omit<DecisionOutput, 'notify_discord'> = {
    decision_type,
    criticality,
    reasoning,
    implementation_prompt,
    user_response,
  };
  if (out.criticality === 'critical') {
    out = { ...out, decision_type: 'needs_approval' };
  }
  return applyImplementationPromptGuard(out);
}

function applyImplementationPromptGuard(
  out: Omit<DecisionOutput, 'notify_discord'>
): Omit<DecisionOutput, 'notify_discord'> {
  if (!out.implementation_prompt) {
    return out;
  }

  const sanitized = sanitizeImplementationPrompt(out.implementation_prompt);
  if (sanitized.ok) {
    return { ...out, implementation_prompt: sanitized.sanitized };
  }

  return {
    ...out,
    decision_type: 'needs_approval',
    implementation_prompt: undefined,
    reasoning: `${out.reasoning} [implementation_prompt bloqueado: ${sanitized.violations.join(', ')}]`,
    user_response: guardChatOutput(out.user_response),
  };
}

function conversationHasBlockedInjection(messages: Array<{ role: string; content: string }>): boolean {
  return messages.some(
    (m) => m.role === 'user' && detectPromptInjection(m.content).blocked
  );
}

function toChatTurns(messages: Array<{ role: string; content: string }>): ChatTurn[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
}

export interface AnalyzeFeedbackResult {
  output: DecisionOutput;
  decision_id: string | null;
}

export async function analyzeFeedback(
  input: FeedbackInput,
  supabase: SupabaseClient = getSupabase()
): Promise<AnalyzeFeedbackResult> {
  if (conversationHasBlockedInjection(input.messages)) {
    const output: DecisionOutput = {
      decision_type: 'needs_approval',
      criticality: 'medium',
      reasoning: 'Contenido bloqueado por política anti prompt-injection',
      user_response: 'Gracias por tu feedback. Un miembro del equipo lo revisará manualmente.',
      notify_discord: true,
    };
    return persistDecision(supabase, input.conversation_id, output);
  }

  const conversationBlock = wrapConversationHistory(toChatTurns(input.messages));
  const userPayload = [
    buildFeedbackAnalysisUserPayload(conversationBlock),
    '',
    'AUTO_IMPLEMENT (implementar solo, sin aprobación):',
    ...AUTO_IMPLEMENT_RULES.map((r) => `- ${r}`),
    '',
    'NEEDS_APPROVAL (requiere aprobación humana):',
    ...NEEDS_APPROVAL_RULES.map((r) => `- ${r}`),
    '',
    'CRITICAL (urgente, notificar inmediatamente):',
    ...CRITICAL_RULES.map((r) => `- ${r}`),
    '',
    'REJECTED: si no aplica, es spam, o está fuera de scope.',
  ].join('\n');

  const analysis = await llmCall({
    tenant_slug: 'platform',
    model: 'haiku',
    temperature: 0,
    cache: false,
    system: FEEDBACK_ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPayload }],
  });

  const base = parseDecisionFromLlm(analysis.content);
  const output: DecisionOutput = {
    ...base,
    user_response: guardChatOutput(base.user_response),
    notify_discord: base.criticality !== 'low',
  };

  return persistDecision(supabase, input.conversation_id, output);
}

async function persistDecision(
  supabase: SupabaseClient,
  conversationId: string,
  output: DecisionOutput
): Promise<AnalyzeFeedbackResult> {
  const { data: inserted, error: insErr } = await supabase
    .schema('platform')
    .from('feedback_decisions')
    .insert({
      conversation_id: conversationId,
      decision_type: output.decision_type,
      criticality: output.criticality,
      reasoning: output.reasoning,
      implementation_prompt: output.implementation_prompt ?? null,
    })
    .select('id')
    .single();

  if (insErr) {
    console.error('[feedback-decision-engine] insert decision:', insErr);
  }

  const decision_id =
    inserted && typeof inserted === 'object' && 'id' in inserted ? String(inserted.id) : null;

  const { error: updErr } = await supabase
    .schema('platform')
    .from('feedback_conversations')
    .update({
      status: conversationStatusForDecision(output.decision_type),
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  if (updErr) {
    console.error('[feedback-decision-engine] update conversation:', updErr);
  }

  return { output, decision_id };
}

export async function executeAutoImplement(
  decisionId: string,
  prompt: string,
  tenantSlug: string
): Promise<void> {
  const sanitized = sanitizeImplementationPrompt(prompt);
  if (!sanitized.ok) {
    throw new Error(
      `implementation_prompt rejected: ${sanitized.violations.join(', ')}`
    );
  }

  const fullPrompt = [
    `# Auto-implementación desde feedback`,
    `# Decision ID: ${decisionId}`,
    `# Tenant: ${tenantSlug}`,
    `# Fecha: ${new Date().toISOString()}`,
    `# IMPORTANTE: Este cambio fue aprobado por un administrador`,
    `# Solo implementar si es un cambio menor y seguro (sin comandos shell)`,
    ``,
    sanitized.sanitized,
  ].join('\n');

  await writeActivePrompt(fullPrompt);
}
