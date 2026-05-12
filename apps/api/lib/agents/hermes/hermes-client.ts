import { runAiGatewayChat, safeGatewayErrorMessage } from '../../ai-gateway/gateway';
import type { ChatMessage } from '../../ai-gateway/types';

const HERMES_SYSTEM =
  "You are Hermes, Opsly's skeptical senior AI agent. Your job is to analyze tasks, challenge assumptions, identify risks, and produce actionable execution steps. Be concise, technical, and security-aware.";

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

function readOptionalEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value !== undefined && value.length > 0 ? value : undefined;
}

function defaultHermesModel(mode: HermesMode): string | undefined {
  switch (mode) {
    case 'review':
      return readOptionalEnv('AI_ROUTE_FAST') ?? readOptionalEnv('HERMES_MODEL');
    case 'plan':
      return readOptionalEnv('AI_ROUTE_ARCHITECT') ?? readOptionalEnv('HERMES_MODEL');
    case 'debug':
      return readOptionalEnv('AI_ROUTE_CODING') ?? readOptionalEnv('HERMES_MODEL');
    case 'security':
      return (
        readOptionalEnv('AI_ROUTE_SECURITY') ??
        readOptionalEnv('SECURITY_MODEL') ??
        readOptionalEnv('HERMES_MODEL')
      );
    case 'research':
      return readOptionalEnv('AI_ROUTE_REASONING') ?? readOptionalEnv('HERMES_MODEL');
    default:
      return readOptionalEnv('HERMES_MODEL');
  }
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
 * Ejecuta Hermes en servidor vía {@link runAiGatewayChat} (NVIDIA u otro proveedor según env),
 * sin llamadas directas del cliente a NVIDIA.
 */
export async function runHermesTask(input: RunHermesTaskInput): Promise<RunHermesTaskResult> {
  const task = input.task?.trim() ?? '';
  if (task.length === 0) {
    return { ok: false, error: 'task is required' };
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: HERMES_SYSTEM },
    { role: 'user', content: buildUserPayload(input) },
  ];

  try {
    const out = await runAiGatewayChat({
      messages,
      model: input.model?.trim() || defaultHermesModel(input.mode),
      temperature: 0.2,
      metadata: { agent: 'hermes', mode: input.mode },
    });
    return {
      ok: true,
      provider: out.provider,
      model: out.model,
      result: out.content,
    };
  } catch (err) {
    return { ok: false, error: safeGatewayErrorMessage(err) };
  }
}
