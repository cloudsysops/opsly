/**
 * Gateway LiteLLM (npm `litellm`) para la capa consciente del Orchestrator.
 * Trazabilidad: `tenant_id` y `request_id` van en el mensaje system (metadatos de la llamada).
 *
 * Política Opsly: el planner remoto sigue yendo al LLM Gateway HTTP; esta capa es opcional
 * y se activa con ORCHESTRATOR_CONSCIOUS_LAYER=true.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { completion } from 'litellm';

export type CallLlmContext = {
  /** Texto de memoria / recuperación RAG */
  readonly memoryContext: string;
  /** Descripciones de herramientas candidatas */
  readonly toolsContext: string;
  /** UUID tenant (trazabilidad) */
  readonly tenantId: string;
  /** Correlación */
  readonly requestId: string;
};

export type CallLlmOptions = {
  /** Forzar modelo (ej. gpt-4o, gpt-4o-mini) */
  readonly model?: string;
  readonly temperature?: number;
};

function defaultModelForIntent(userPrompt: string): string {
  const m = process.env.ORCHESTRATOR_LLM_MODEL?.trim();
  if (m) {
    return m;
  }
  const complex =
    userPrompt.length > 400 || /optimiz|arquitect|multi-?step|plan\s+complejo/i.test(userPrompt);
  return complex ? 'gpt-4o' : 'gpt-4o-mini';
}

function apiKeyForModel(model: string): string | undefined {
  if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3')) {
    return process.env.OPENAI_API_KEY?.trim();
  }
  if (model.startsWith('claude')) {
    return process.env.ANTHROPIC_API_KEY?.trim();
  }
  return process.env.OPENAI_API_KEY?.trim() ?? process.env.ANTHROPIC_API_KEY?.trim();
}

/**
 * Invoca un chat completion vía LiteLLM con contexto de memoria + herramientas inyectado.
 */
export async function callLLM(
  userPrompt: string,
  context: CallLlmContext,
  options?: CallLlmOptions
): Promise<string> {
  const model = options?.model ?? defaultModelForIntent(userPrompt);
  const apiKey = apiKeyForModel(model);
  if (!apiKey) {
    throw new Error(
      'callLLM: falta OPENAI_API_KEY o ANTHROPIC_API_KEY según el modelo seleccionado'
    );
  }

  const systemParts = [
    'Eres la capa de razonamiento auxiliar del Orchestrator Opsly.',
    'Responde en español con texto breve y accionable (sin JSON a menos que se pida).',
    'Metadatos de trazabilidad (no inventes valores):',
    `tenant_id=${context.tenantId}`,
    `request_id=${context.requestId}`,
    '---',
    'Fragmentos de memoria recuperada (RAG):',
    context.memoryContext || '(vacío)',
    '---',
    'Herramientas relevantes (solo descripciones):',
    context.toolsContext || '(ninguna)',
  ];

  const res = await completion({
    model,
    messages: [
      { role: 'system', content: systemParts.join('\n') },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
    temperature: options?.temperature ?? 0.3,
    apiKey,
  });

  if (!('choices' in res) || !Array.isArray(res.choices)) {
    return '';
  }
  const first = res.choices[0];
  const content = first?.message?.content;
  return typeof content === 'string' ? content : '';
}

/**
 * Lee rutas de modelo desde litellm_config.yaml (opcional, solo documentación / futuro).
 */
export function readLitellmConfigHint(): string {
  try {
    const path = join(process.cwd(), 'litellm_config.yaml');
    return readFileSync(path, 'utf8').slice(0, 500);
  } catch {
    return '';
  }
}
