import { completeWithProviderId } from '../llm-direct.js';
import type { LLMRequest } from '../types.js';
import type { ProviderId } from '../providers.js';

export interface EnsembleBranchResult {
  id: ProviderId;
  ok: boolean;
  content?: string;
  error?: string;
  tokens_input?: number;
  tokens_output?: number;
  cost_usd?: number;
}

export async function runQuantumEnsemble(
  providerIds: readonly ProviderId[],
  baseReq: LLMRequest
): Promise<EnsembleBranchResult[]> {
  const settled = await Promise.allSettled(
    providerIds.map(async (id) => {
      const res = await completeWithProviderId(id, {
        ...baseReq,
        cache: false,
        skip_repo_context: true,
        usage_metadata: {
          ...(baseReq.usage_metadata ?? {}),
          quantum_branch: id,
        },
      });
      return {
        id,
        ok: true as const,
        content: res.content,
        tokens_input: res.tokens_input,
        tokens_output: res.tokens_output,
        cost_usd: res.cost_usd,
      };
    })
  );

  const out: EnsembleBranchResult[] = [];
  for (let i = 0; i < settled.length; i += 1) {
    const id = providerIds[i]!;
    const s = settled[i]!;
    if (s.status === 'fulfilled') {
      out.push(s.value);
    } else {
      const msg = s.reason instanceof Error ? s.reason.message : String(s.reason);
      out.push({ id, ok: false, error: msg });
    }
  }
  return out;
}
