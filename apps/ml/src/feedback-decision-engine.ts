/**
 * ML Decision Engine — clasifica feedback y persiste decisión en Supabase.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { llmCall } from '@intcloudsysops/llm-gateway';
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
  return out;
}

export interface AnalyzeFeedbackResult {
  output: DecisionOutput;
  decision_id: string | null;
}

export async function analyzeFeedback(
  input: FeedbackInput,
  supabase: SupabaseClient = getSupabase()
): Promise<AnalyzeFeedbackResult> {
  const conversation = input.messages.map((m) => `${m.role}: ${m.content}`).join('\n');

  const analysis = await llmCall({
    tenant_slug: 'platform',
    model: 'haiku',
    temperature: 0,
    cache: false,
    messages: [
      {
        role: 'user',
        content: `Analiza este feedback de usuario y decide qué hacer.

AUTO_IMPLEMENT (implementar solo, sin aprobación):
${AUTO_IMPLEMENT_RULES.map((r) => `- ${r}`).join('\n')}

NEEDS_APPROVAL (requiere aprobación humana):
${NEEDS_APPROVAL_RULES.map((r) => `- ${r}`).join('\n')}

CRITICAL (urgente, notificar inmediatamente):
${CRITICAL_RULES.map((r) => `- ${r}`).join('\n')}

REJECTED: si no aplica, es spam, o está fuera de scope.

Conversación:
${conversation}

Responde SOLO en JSON:
{
  "decision_type": "auto_implement|needs_approval|rejected|scheduled",
  "criticality": "low|medium|high|critical",
  "reasoning": "por qué tomaste esta decisión",
  "implementation_prompt": "prompt exacto para Cursor si es auto_implement, null si no",
  "user_response": "mensaje amigable para el usuario explicando qué pasará",
  "category": "bug|feature|improvement|security|billing|other",
  "estimated_effort": "minutes|hours|days"
}`,
      },
    ],
  });

  const base = parseDecisionFromLlm(analysis.content);
  const output: DecisionOutput = {
    ...base,
    notify_discord: base.criticality !== 'low',
  };

  const { data: inserted, error: insErr } = await supabase
    .schema('platform')
    .from('feedback_decisions')
    .insert({
      conversation_id: input.conversation_id,
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
    .eq('id', input.conversation_id);

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
  const fullPrompt = [
    `# Auto-implementación desde feedback`,
    `# Decision ID: ${decisionId}`,
    `# Tenant: ${tenantSlug}`,
    `# Fecha: ${new Date().toISOString()}`,
    `# IMPORTANTE: Este cambio fue aprobado automáticamente por ML`,
    `# Solo implementar si es un cambio menor y seguro`,
    ``,
    prompt,
    ``,
    `# Al terminar: notificar Discord con el resultado`,
    `./scripts/utils/notify-discord.sh \\`,
    `  "✅ Auto-implementado desde feedback" \\`,
    `  "Decision: ${decisionId}" \\`,
    `  "success"`,
  ].join('\n');

  await writeActivePrompt(fullPrompt);
}
