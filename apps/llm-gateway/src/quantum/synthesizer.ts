import { llmCallDirect } from '../llm-direct.js';
import type { LLMRequest } from '../types.js';
import type { ProviderId } from '../providers.js';

export async function synthesizeQuantumResponses(
  originalPrompt: string,
  branches: ReadonlyArray<{ id: ProviderId; content: string }>,
  ctx: LLMRequest
): Promise<Awaited<ReturnType<typeof llmCallDirect>>> {
  const lines = branches
    .map((b, i) => `### Output ${String(i + 1)} (${b.id})\n${b.content.trim()}`)
    .join('\n\n');
  const system =
    'You are a careful synthesizer. Combine the model outputs into one accurate, concise answer to the user task. Resolve disagreements by preferring explicit facts and consensus. Output plain text only.';
  const user = `Task:\n${originalPrompt}\n\nModel outputs:\n${lines}\n\nFinal answer:`;
  return llmCallDirect({
    ...ctx,
    messages: [{ role: 'user', content: user }],
    system,
    cache: false,
    skip_repo_context: true,
    routing_bias: 'quality',
    max_tokens: 2048,
    temperature: 0.2,
    usage_metadata: {
      ...(ctx.usage_metadata ?? {}),
      quantum_phase: 'synthesis',
    },
  });
}
