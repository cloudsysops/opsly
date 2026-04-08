import { batchedLLMCall } from "./batcher.js";
import { analyzeComplexity } from "./complexity.js";
import { decomposeAndExecute } from "./decomposer.js";
import { llmCallDirect } from "./llm-direct.js";
import type { LLMRequest, LLMResponse } from "./types.js";

function contextLength(req: LLMRequest): number {
  return req.messages.reduce((s, m) => s + m.content.length, 0);
}

export { llmCallDirect } from "./llm-direct.js";

/** Entrada pública: descomposición, batch por complejidad y enrutado multi-proveedor. */
export async function llmCall(req: LLMRequest): Promise<LLMResponse> {
  const last = req.messages.at(-1)?.content ?? "";
  const analysis = analyzeComplexity(last, { context_length: contextLength(req) });

  if (analysis.should_decompose) {
    const decomposed = await decomposeAndExecute(req);
    return {
      content: decomposed.merged,
      model_used: "decomposed",
      tokens_input: 0,
      tokens_output: 0,
      cost_usd: decomposed.total_cost_usd,
      cache_hit: false,
      latency_ms: 0,
      savings_usd: decomposed.savings_vs_sonnet,
    };
  }

  return batchedLLMCall(req, analysis.level);
}
