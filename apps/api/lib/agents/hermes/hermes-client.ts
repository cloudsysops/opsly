import { runAiGatewayChat, safeGatewayErrorMessage } from '../../ai-gateway/gateway';

const HERMES_SYSTEM =
  "You are Hermes, Opsly's skeptical senior AI agent. Your job is to analyze tasks, challenge assumptions, identify risks, and produce actionable execution steps. Be concise, technical, and security-aware.";
const HERMES_TENANT_SLUG = 'opsly';

export type HermesMode = 'review' | 'plan' | 'debug' | 'security' | 'research';

export type RunHermesTaskInput = {
  task: string;
  context?: string;
  model?: string;
  mode: HermesMode;
};

export type RunHermesTaskResult =
  | {
      ok: true;
      provider: string;
      model: string;
      result: string;
    }
  | {
      ok: false;
      error: string;
    };

function defaultHermesModel(mode: HermesMode): string {
  if (mode === 'security') {
    return 'opsly:security';
  }
  if (mode === 'plan') {
    return 'opsly:coding';
  }
  return 'opsly:fast';
}

function buildUserPayload(input: RunHermesTaskInput): string {
  const ctx = input.context?.trim() ?? '';
  const parts = [`Mode: ${input.mode}`, '', `Task:\n${input.task.trim()}`];
  if (ctx.length > 0) {
    parts.push('', `Context:\n${ctx}`);
  }
  return parts.join('\n');
}

/**
 * Ejecuta Hermes vía {@link runAiGatewayChat} con alias `opsly:*` (mapeo a AI_ROUTE_* en el gateway).
 */
export async function runHermesTask(input: RunHermesTaskInput): Promise<RunHermesTaskResult> {
  const task = input.task?.trim() ?? '';
  if (task.length === 0) {
    return { ok: false, error: 'task is required' };
  }

  try {
    const out = await runAiGatewayChat({
      messages: [
        { role: 'system', content: HERMES_SYSTEM },
        { role: 'user', content: buildUserPayload(input) },
      ],
      model: input.model?.trim() || defaultHermesModel(input.mode),
      temperature: 0.2,
      max_tokens: 1200,
      metadata: { agent: 'hermes', mode: input.mode, tenant_slug: HERMES_TENANT_SLUG },
    });
    return {
      ok: true,
      provider: out.provider,
      model: out.client_model ?? out.model,
      result: out.content,
    };
  } catch (err) {
    return { ok: false, error: safeGatewayErrorMessage(err) };
  }
}
