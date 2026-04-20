import { randomUUID } from "node:crypto";
import { batchedLLMCall } from "./batcher.js";
import { checkBudget, resolveTenantPlan } from "./budget.js";
import { analyzeComplexity } from "./complexity.js";
import { enrichContext } from "./context-enricher.js";
import { decomposeAndExecute } from "./decomposer.js";
import { detectIntent } from "./intent-detector.js";
import { llmCallDirect } from "./llm-direct.js";
import { logUsage } from "./logger.js";
import { buildPrompt } from "./prompt-builder.js";
import { scoreQuality } from "./quality-scorer.js";
import { formatResponse } from "./response-formatter.js";
import { semanticCacheGetExact, semanticCacheGetSimilar, semanticCacheSet } from "./semantic-cache.js";
import { hashPrompt } from "./hash.js";
import { logGatewayEvent } from "./structured-log.js";
import { fetchRepoContextBlock } from "./repo-context-client.js";
import type { LLMMessage, LLMRequest, LLMResponse } from "./types.js";

function contextLength(req: LLMRequest): number {
  return req.messages.reduce((s, m) => s + m.content.length, 0);
}

export { llmCallDirect } from "./llm-direct.js";

function isLegacyMode(req: LLMRequest): boolean {
  if (req.legacy_pipeline === true) {
    return true;
  }
  return process.env.LLM_GATEWAY_LEGACY === "true";
}

/** Camino v1 (Beast Mode sin pipeline v3). */
export async function legacyLlmCall(req: LLMRequest): Promise<LLMResponse> {
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

function estimateTokensFromText(s: string): number {
  return Math.max(1, Math.ceil(s.length / 4));
}

/** Repo-First RAG: inyecta contexto local antes del pipeline (sin fallar si context-builder no responde). */
async function mergeRepoContext(req: LLMRequest): Promise<LLMRequest> {
  if (req.skip_repo_context === true) {
    return req;
  }
  if (process.env.LLM_GATEWAY_REPO_CONTEXT !== "true") {
    return req;
  }
  const query = req.messages.at(-1)?.content ?? "";
  if (!query.trim()) {
    return req;
  }
  const block = await fetchRepoContextBlock(query);
  if (!block) {
    return req;
  }
  const system = [req.system, "## Repo context (Opsly knowledge)\n", block].filter(Boolean).join("\n\n");
  return { ...req, system };
}

export async function v3Pipeline(req: LLMRequest): Promise<LLMResponse> {
  const start = Date.now();
  const userMsg = req.messages.at(-1)?.content ?? "";
  const intent = await detectIntent(req.tenant_slug, userMsg);
  const ctx = await enrichContext(req.tenant_slug, userMsg, intent);
  const structuredPrompt = buildPrompt(userMsg, intent, ctx);
  const structuredMessages: LLMMessage[] = [{ role: "user", content: structuredPrompt }];
  const promptHash = hashPrompt(structuredMessages, req.system);

  const exact = await semanticCacheGetExact(req.tenant_slug, promptHash);
  if (exact) {
    const fmt = formatResponse(exact.response, req.output_channel, {
      intent,
      quality_score: exact.quality_score ?? undefined,
    });
    return {
      content: fmt.content,
      model_used: exact.model_used ?? "semantic_cache_exact",
      tokens_input: 0,
      tokens_output: 0,
      cost_usd: 0,
      cache_hit: true,
      latency_ms: Date.now() - start,
      intent,
      quality_score: exact.quality_score ?? undefined,
      formatted: fmt.formatted,
      semantic_cache_hit: true,
    };
  }

  const similar = await semanticCacheGetSimilar(req.tenant_slug, structuredPrompt, 0.9);
  if (similar?.response) {
    const fmt = formatResponse(similar.response, req.output_channel, {
      intent,
      quality_score: similar.quality_score ?? undefined,
    });
    return {
      content: fmt.content,
      model_used: "semantic_cache_similar",
      tokens_input: 0,
      tokens_output: 0,
      cost_usd: 0,
      cache_hit: true,
      latency_ms: Date.now() - start,
      intent,
      quality_score: similar.quality_score ?? undefined,
      formatted: fmt.formatted,
      semantic_cache_hit: true,
    };
  }

  const plan = req.tenant_plan ?? (await resolveTenantPlan(req.tenant_slug));
  const budget = await checkBudget(req.tenant_slug, plan);
  if (!budget.allowed) {
    const msg = `Presupuesto LLM del tenant agotado para el mes (plan ${plan}). Contacta soporte o actualiza plan.`;
    return {
      content: msg,
      model_used: "gateway_budget",
      tokens_input: 0,
      tokens_output: 0,
      cost_usd: 0,
      cache_hit: false,
      latency_ms: Date.now() - start,
      intent,
    };
  }

  const analysis = analyzeComplexity(structuredPrompt, {
    context_length: structuredPrompt.length + contextLength(req),
  });

  let innerReq: LLMRequest = {
    ...req,
    tenant_plan: plan,
    messages: structuredMessages,
    skip_usage_log: true,
    cache: req.cache !== false,
  };

  if (budget.force_cheap) {
    innerReq = { ...innerReq, model: "cheap" };
  }

  let response: LLMResponse;
  if (analysis.should_decompose) {
    const decomposed = await decomposeAndExecute(innerReq);
    response = {
      content: decomposed.merged,
      model_used: "decomposed",
      tokens_input: estimateTokensFromText(structuredPrompt),
      tokens_output: estimateTokensFromText(decomposed.merged),
      cost_usd: decomposed.total_cost_usd,
      cache_hit: false,
      latency_ms: 0,
      savings_usd: decomposed.savings_vs_sonnet,
    };
  } else {
    response = await batchedLLMCall(innerReq, analysis.level);
  }

  const constraintsSummary =
    "Sin any; bash set -euo pipefail; sin secretos hardcodeados; Traefik v3; schema platform.";
  let q = await scoreQuality(req.tenant_slug, userMsg, constraintsSummary, response.content);
  let attempts = 0;
  while (q.score < 60 && attempts < 2) {
    attempts += 1;
    const retryReq: LLMRequest = {
      ...innerReq,
      model: "sonnet",
      cache: false,
      skip_usage_log: true,
    };
    response = await llmCallDirect(retryReq);
    q = await scoreQuality(req.tenant_slug, userMsg, constraintsSummary, response.content);
  }

  await logUsage({
    tenant_slug: req.tenant_slug,
    model: response.model_used,
    tokens_input: response.tokens_input,
    tokens_output: response.tokens_output,
    cost_usd: response.cost_usd,
    cache_hit: response.cache_hit,
    session_id: req.session_id,
    request_id: req.request_id,
    created_at: new Date().toISOString(),
    quality_score: q.score,
  });

  if (req.cache !== false) {
    await semanticCacheSet({
      tenant_slug: req.tenant_slug,
      messages: structuredMessages,
      system: req.system,
      promptText: structuredPrompt,
      response: response.content,
      model_used: response.model_used,
      quality_score: q.score,
    });
  }

  const fmt = formatResponse(response.content, req.output_channel, {
    intent,
    quality_score: q.score,
  });

  return {
    ...response,
    content: fmt.content,
    intent,
    quality_score: q.score,
    formatted: fmt.formatted,
    latency_ms: Date.now() - start,
    budget_forced_cheap: budget.force_cheap,
  };
}

/** Pipeline interno (sin log de línea única en stdout). */
async function llmCallPipeline(req: LLMRequest): Promise<LLMResponse> {
  if (isLegacyMode(req)) {
    return legacyLlmCall(req);
  }
  return v3Pipeline(req);
}

/** Entrada pública: pipeline v3 por defecto; Beast Mode v1 con LLM_GATEWAY_LEGACY=true o legacy_pipeline. */
export async function llmCall(req: LLMRequest): Promise<LLMResponse> {
  const request_id = req.request_id ?? randomUUID();
  const legacy_pipeline = isLegacyMode(req);
  const start = Date.now();
  try {
    const withContext = await mergeRepoContext(req);
    const res = await llmCallPipeline(withContext);
    logGatewayEvent({
      event: "llm_call_complete",
      tenant_slug: req.tenant_slug,
      request_id,
      model_used: res.model_used,
      tokens_input: res.tokens_input,
      tokens_output: res.tokens_output,
      cost_usd: res.cost_usd,
      cache_hit: res.cache_hit,
      latency_ms: Date.now() - start,
      legacy_pipeline,
      ...(req.routing_bias !== undefined ? { routing_bias: req.routing_bias } : {}),
    });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logGatewayEvent({
      event: "llm_call_error",
      tenant_slug: req.tenant_slug,
      request_id,
      latency_ms: Date.now() - start,
      legacy_pipeline,
      ...(req.routing_bias !== undefined ? { routing_bias: req.routing_bias } : {}),
      error: msg,
    });
    throw err;
  }
}
