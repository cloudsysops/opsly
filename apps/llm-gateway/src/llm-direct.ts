import Anthropic from "@anthropic-ai/sdk";
import { analyzeComplexity } from "./complexity.js";
import { cacheGet, cacheSet } from "./cache.js";
import { healthDaemon } from "./health-daemon.js";
import { hashPrompt } from "./hash.js";
import { logUsage } from "./logger.js";
import {
  getProvidersByPreference,
  PROVIDERS,
  resolveRoutingPreference,
  type ProviderChainEntry,
  type ProviderDefinition,
} from "./providers.js";
import { estimateCost } from "./router.js";
import type { LLMMessage, LLMRequest, LLMResponse } from "./types.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function contextLength(msgs: LLMMessage[]): number {
  return msgs.reduce((s, m) => s + m.content.length, 0);
}

async function buildChain(req: LLMRequest): Promise<ProviderChainEntry[]> {
  const last = req.messages.at(-1)?.content ?? "";
  const analysis = analyzeComplexity(last, {
    context_length: contextLength(req.messages),
  });
  const pref = resolveRoutingPreference(req.model, analysis.level);
  return getProvidersByPreference(pref);
}

async function invokeAnthropic(
  model: string,
  req: LLMRequest,
): Promise<{ content: string; tokens_in: number; tokens_out: number }> {
  const response = await anthropic.messages.create({
    model,
    max_tokens: req.max_tokens ?? 1000,
    system: req.system,
    messages: req.messages,
    temperature: req.temperature ?? 0,
  });
  const first = response.content[0];
  const content = first && first.type === "text" ? first.text : "";
  return {
    content,
    tokens_in: response.usage.input_tokens,
    tokens_out: response.usage.output_tokens,
  };
}

type OllamaChatResponse = {
  message?: { content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
};

async function invokeOllama(
  def: ProviderDefinition,
  req: LLMRequest,
): Promise<{ content: string; tokens_in: number; tokens_out: number }> {
  const base = def.baseUrl ?? "http://localhost:11434";
  const messages: Array<{ role: string; content: string }> = req.system
    ? [{ role: "system", content: req.system }, ...req.messages.map((m) => ({ role: m.role, content: m.content }))]
    : req.messages.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: def.model,
      messages,
      stream: false,
      options: { temperature: req.temperature ?? 0 },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = (await res.json()) as OllamaChatResponse;
  return {
    content: data.message?.content ?? "",
    tokens_in: data.prompt_eval_count ?? 0,
    tokens_out: data.eval_count ?? 0,
  };
}

type OpenAICompatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

function openAiStyleMessages(req: LLMRequest): Array<{ role: string; content: string }> {
  const core = req.messages.map((m) => ({ role: m.role, content: m.content }));
  if (req.system) {
    return [{ role: "system", content: req.system }, ...core];
  }
  return core;
}

async function invokeOpenAiCompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  req: LLMRequest,
  extraHeaders?: Record<string, string>,
): Promise<{ content: string; tokens_in: number; tokens_out: number }> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: openAiStyleMessages(req),
      max_tokens: req.max_tokens ?? 1000,
      temperature: req.temperature ?? 0,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`OpenAI-compat HTTP ${res.status}`);
  const data = (await res.json()) as OpenAICompatResponse;
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    tokens_in: data.usage?.prompt_tokens ?? 0,
    tokens_out: data.usage?.completion_tokens ?? 0,
  };
}

async function runProvider(
  entry: ProviderChainEntry,
  req: LLMRequest,
): Promise<{
  content: string;
  tokens_in: number;
  tokens_out: number;
  model_used: string;
  billing: ProviderDefinition;
}> {
  const { def } = entry;
  if (def.kind === "anthropic") {
    const out = await invokeAnthropic(def.model, req);
    return { ...out, model_used: def.model, billing: def };
  }
  if (def.kind === "ollama") {
    const out = await invokeOllama(def, req);
    return { ...out, model_used: def.model, billing: def };
  }
  if (def.kind === "openrouter") {
    const key = process.env.OPENROUTER_API_KEY ?? "";
    if (!key) throw new Error("OPENROUTER_API_KEY no configurada");
    const base = def.baseUrl ?? "https://openrouter.ai/api/v1";
    const out = await invokeOpenAiCompatible(
      `${base}/chat/completions`,
      key,
      def.model,
      req,
      {
        "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER ?? "https://opsly.local",
        "X-Title": "Opsly LLM Gateway",
      },
    );
    return { ...out, model_used: def.model, billing: def };
  }
  const key = process.env.OPENAI_API_KEY ?? "";
  if (!key) throw new Error("OPENAI_API_KEY no configurada");
  const out = await invokeOpenAiCompatible(
    "https://api.openai.com/v1/chat/completions",
    key,
    def.model,
    req,
  );
  return { ...out, model_used: def.model, billing: def };
}

async function finalizeSuccess(
  req: LLMRequest,
  shouldCache: boolean,
  start: number,
  content: string,
  tokens_in: number,
  tokens_out: number,
  model_used: string,
  billing: ProviderDefinition,
): Promise<LLMResponse> {
  const cost = estimateCost(billing, tokens_in, tokens_out);
  if (shouldCache) {
    const promptHash = hashPrompt(req.messages, req.system);
    await cacheSet(req.tenant_slug, promptHash, content);
  }
  await logUsage({
    tenant_slug: req.tenant_slug,
    model: model_used,
    tokens_input: tokens_in,
    tokens_output: tokens_out,
    cost_usd: cost,
    cache_hit: false,
    session_id: req.session_id,
    created_at: new Date().toISOString(),
  });
  return {
    content,
    model_used,
    tokens_input: tokens_in,
    tokens_output: tokens_out,
    cost_usd: cost,
    cache_hit: false,
    latency_ms: Date.now() - start,
  };
}

/** Llamada directa al proveedor — sin batch ni descomposición (uso interno). */
export async function llmCallDirect(req: LLMRequest): Promise<LLMResponse> {
  const start = Date.now();
  const shouldCache = req.cache !== false && (req.temperature ?? 0) === 0;

  if (shouldCache) {
    const promptHash = hashPrompt(req.messages, req.system);
    const cached = await cacheGet(req.tenant_slug, promptHash);
    if (cached) {
      return {
        content: cached,
        model_used: "cache",
        tokens_input: 0,
        tokens_output: 0,
        cost_usd: 0,
        cache_hit: true,
        latency_ms: Date.now() - start,
      };
    }
  }

  const chain = await buildChain(req);
  let lastErr: unknown;

  for (const entry of chain) {
    const healthy = await healthDaemon.isAvailable(entry.healthKey);
    if (!healthy) continue;
    try {
      const { content, tokens_in, tokens_out, model_used, billing } = await runProvider(entry, req);
      return await finalizeSuccess(req, shouldCache, start, content, tokens_in, tokens_out, model_used, billing);
    } catch (e) {
      lastErr = e;
    }
  }

  const fallback: ProviderChainEntry = {
    id: "claude_haiku",
    healthKey: PROVIDERS.claude_haiku.healthKey,
    def: PROVIDERS.claude_haiku,
  };
  try {
    const { content, tokens_in, tokens_out, model_used, billing } = await runProvider(fallback, req);
    return await finalizeSuccess(req, shouldCache, start, content, tokens_in, tokens_out, model_used, billing);
  } catch (e) {
    const last = lastErr instanceof Error ? lastErr.message : String(lastErr);
    const cur = e instanceof Error ? e.message : String(e);
    throw new Error(`LLM providers agotados. Último error en cadena: ${last}. Fallback Haiku: ${cur}`);
  }
}
