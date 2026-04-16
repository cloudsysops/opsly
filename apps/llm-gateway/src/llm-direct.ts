import Anthropic from "@anthropic-ai/sdk";
import { cacheGet, cacheSet } from "./cache.js";
import { analyzeComplexity } from "./complexity.js";
import { checkDailyBudget, resolveAiProfile } from "./config/budgets.js";
import { hashPrompt } from "./hash.js";
import { healthDaemon } from "./health-daemon.js";
import { logUsage } from "./logger.js";
import {
  notifyBudgetExceeded,
  notifyBudgetWarning,
  notifyProviderRateLimit,
} from "./providers/discord.js";
import {
    PROVIDERS,
    type ProviderChainEntry,
    type ProviderDefinition,
} from "./providers.js";
import { estimateCost } from "./router.js";
import type { LLMMessage, LLMRequest, LLMResponse } from "./types.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export class GatewayHttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
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
  timeoutMs = 60_000,
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
    signal: AbortSignal.timeout(timeoutMs),
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
  timeoutMs?: number,
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
    const out = await invokeOllama(def, req, timeoutMs);
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

function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.toLowerCase().includes("rate limit");
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
  if (!req.skip_usage_log) {
    await logUsage({
      tenant_slug: req.tenant_slug,
      model: model_used,
      tokens_input: tokens_in,
      tokens_output: tokens_out,
      cost_usd: cost,
      cache_hit: false,
      session_id: req.session_id,
      request_id: req.request_id,
      created_at: new Date().toISOString(),
    });
  }
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
  void analyzeComplexity(req.messages.at(-1)?.content ?? "", {
    context_length: req.messages.reduce((sum, message) => sum + message.content.length, 0),
  });
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

  const budget = await checkDailyBudget(req.tenant_slug);
  if (!budget.allowed) {
    await notifyBudgetExceeded(req.tenant_slug, budget.usedUsd, budget.budgetUsd).catch(() => undefined);
    throw new GatewayHttpError(
      402,
      `Daily budget exceeded for tenant ${req.tenant_slug}: ${budget.usedUsd.toFixed(4)}/${budget.budgetUsd.toFixed(4)} USD`,
    );
  }
  if (budget.warn) {
    await notifyBudgetWarning(req.tenant_slug, budget.usedUsd, budget.budgetUsd).catch(() => undefined);
  }

  const profile = resolveAiProfile(req.tenant_slug);
  const allowLocal = profile !== "cloud-only";
  const allowCloud = profile !== "free-always";

  let lastErr: unknown;
  if (allowLocal) {
    const localEntry: ProviderChainEntry = {
      id: "llama_local",
      healthKey: PROVIDERS.llama_local.healthKey,
      def: PROVIDERS.llama_local,
    };
    const localHealthy = await healthDaemon.isAvailable(localEntry.healthKey);
    if (localHealthy) {
      try {
        const local = await runProvider(localEntry, req, 1_000);
        return await finalizeSuccess(
          req,
          shouldCache,
          start,
          local.content,
          local.tokens_in,
          local.tokens_out,
          local.model_used,
          local.billing,
        );
      } catch (err) {
        lastErr = err;
      }
    } else {
      lastErr = new Error("local provider unhealthy");
    }
  }

  if (!allowCloud) {
    throw new GatewayHttpError(
      503,
      `Local provider unavailable for tenant ${req.tenant_slug} with profile ${profile}`,
    );
  }

  const cloudChain: ProviderChainEntry[] = [
    { id: "claude_haiku", healthKey: PROVIDERS.claude_haiku.healthKey, def: PROVIDERS.claude_haiku },
    { id: "gpt4o_mini", healthKey: PROVIDERS.gpt4o_mini.healthKey, def: PROVIDERS.gpt4o_mini },
    { id: "openrouter_cheap", healthKey: PROVIDERS.openrouter_cheap.healthKey, def: PROVIDERS.openrouter_cheap },
  ];

  for (const entry of cloudChain) {
    const healthy = await healthDaemon.isAvailable(entry.healthKey);
    if (!healthy) {
      continue;
    }
    try {
      const out = await runProvider(entry, req);
      return await finalizeSuccess(
        req,
        shouldCache,
        start,
        out.content,
        out.tokens_in,
        out.tokens_out,
        out.model_used,
        out.billing,
      );
    } catch (err) {
      lastErr = err;
      if (isRateLimitError(err)) {
        await notifyProviderRateLimit(
          req.tenant_slug,
          entry.id,
          err instanceof Error ? err.message : String(err),
        ).catch(() => undefined);
      }
    }
  }

  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(`LLM providers exhausted for tenant ${req.tenant_slug}: ${msg}`);
}
