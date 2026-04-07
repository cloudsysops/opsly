import Anthropic from "@anthropic-ai/sdk";
import { cacheGet, cacheSet } from "./cache.js";
import { hashPrompt } from "./hash.js";
import { logUsage } from "./logger.js";
import { estimateCost, selectModel } from "./router.js";
import type { LLMRequest, LLMResponse } from "./types.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function llmCall(req: LLMRequest): Promise<LLMResponse> {
  const start = Date.now();
  const shouldCache = req.cache !== false && (req.temperature ?? 0) === 0;
  const selectedModel = selectModel(req.model ?? "sonnet");

  if (shouldCache) {
    const promptHash = hashPrompt(req.messages, req.system);
    const cached = await cacheGet(req.tenant_slug, promptHash);
    if (cached) {
      return {
        content: cached,
        model_used: selectedModel.id,
        tokens_input: 0,
        tokens_output: 0,
        cost_usd: 0,
        cache_hit: true,
        latency_ms: Date.now() - start,
      };
    }
  }

  let usedModel = selectedModel;
  let response;
  try {
    response = await anthropic.messages.create({
      model: selectedModel.id,
      max_tokens: req.max_tokens ?? 1000,
      system: req.system,
      messages: req.messages,
      temperature: req.temperature ?? 0,
    });
  } catch {
    usedModel = selectModel("haiku", true);
    response = await anthropic.messages.create({
      model: usedModel.id,
      max_tokens: req.max_tokens ?? 1000,
      system: req.system,
      messages: req.messages,
      temperature: req.temperature ?? 0,
    });
  }

  const first = response.content[0];
  const content = first && first.type === "text" ? first.text : "";
  const tokensInput = response.usage.input_tokens;
  const tokensOutput = response.usage.output_tokens;
  const cost = estimateCost(usedModel, tokensInput, tokensOutput);

  if (shouldCache) {
    const promptHash = hashPrompt(req.messages, req.system);
    await cacheSet(req.tenant_slug, promptHash, content);
  }

  await logUsage({
    tenant_slug: req.tenant_slug,
    model: usedModel.id,
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
    cost_usd: cost,
    cache_hit: false,
    session_id: req.session_id,
    created_at: new Date().toISOString(),
  });

  return {
    content,
    model_used: usedModel.id,
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
    cost_usd: cost,
    cache_hit: false,
    latency_ms: Date.now() - start,
  };
}
