import { llmCallDirect } from './llm-direct.js';
import type { LLMRequest, LLMResponse } from './types.js';

interface BatchItem {
  request: LLMRequest;
  resolve: (r: LLMResponse) => void;
  reject: (e: Error) => void;
  queued_at: number;
}

/** Mayor número = mayor prioridad en flush (enterprise antes que startup). */
function planPriority(tenantPlan: string | undefined): number {
  if (tenantPlan === 'enterprise') {
    return 3;
  }
  if (tenantPlan === 'business') {
    return 2;
  }
  return 1;
}

const BATCH_CONFIG = {
  1: { max_size: 10, window_ms: 50, label: 'Llama/simple' },
  2: { max_size: 5, window_ms: 100, label: 'Haiku/moderate' },
  3: { max_size: 3, window_ms: 200, label: 'Sonnet/complex' },
} as const;

function windowFor(level: 1 | 2 | 3): number {
  const scale = Number(process.env.LLM_BATCH_WINDOW_SCALE ?? '1');
  const raw = BATCH_CONFIG[level].window_ms * scale;
  return Math.max(0, Math.round(raw));
}

const queues: Record<number, BatchItem[]> = { 1: [], 2: [], 3: [] };
const timers: Record<number, NodeJS.Timeout | null> = { 1: null, 2: null, 3: null };

export function batchedLLMCall(request: LLMRequest, level: 1 | 2 | 3): Promise<LLMResponse> {
  return new Promise((resolve, reject) => {
    queues[level].push({
      request,
      resolve,
      reject,
      queued_at: Date.now(),
    });

    const config = BATCH_CONFIG[level];
    const w = windowFor(level);

    if (queues[level].length >= config.max_size) {
      void flushQueue(level);
      return;
    }

    if (!timers[level]) {
      timers[level] = setTimeout(() => {
        void flushQueue(level);
      }, w);
    }
  });
}

async function flushQueue(level: 1 | 2 | 3): Promise<void> {
  if (timers[level]) {
    clearTimeout(timers[level]!);
    timers[level] = null;
  }

  const batch = queues[level].splice(0);
  if (batch.length === 0) return;

  batch.sort((a, b) => planPriority(b.request.tenant_plan) - planPriority(a.request.tenant_plan));

  if (batch.length === 1) {
    try {
      const result = await llmCallDirect(batch[0].request);
      batch[0].resolve(result);
    } catch (err) {
      batch[0].reject(err instanceof Error ? err : new Error(String(err)));
    }
    return;
  }

  try {
    const results = await batchExecute(batch, level);
    results.forEach((r, i) => batch[i].resolve(r));
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    batch.forEach((item) => item.reject(e));
  }
}

async function batchExecute(items: BatchItem[], level: 1 | 2 | 3): Promise<LLMResponse[]> {
  if (level <= 2) {
    return Promise.all(items.map((item) => llmCallDirect(item.request)));
  }

  const combinedPrompt = items
    .map((item, i) => `--- TAREA ${i + 1} ---\n${item.request.messages.at(-1)?.content ?? ''}`)
    .join('\n\n');

  const combined = await llmCallDirect({
    ...items[0].request,
    model: 'sonnet',
    messages: [
      {
        role: 'user',
        content: `Responde CADA tarea numerada por separado.
Formato: {"task_1": "...", "task_2": "...", ...}

${combinedPrompt}`,
      },
    ],
  });

  try {
    const parsed = JSON.parse(combined.content) as Record<string, string>;
    const n = items.length;
    return items.map((_, i) => ({
      ...combined,
      content: parsed[`task_${i + 1}`] ?? combined.content,
      cost_usd: combined.cost_usd / n,
      tokens_input: Math.ceil(combined.tokens_input / n),
      tokens_output: Math.ceil(combined.tokens_output / n),
      cache_hit: false,
    }));
  } catch {
    const n = items.length;
    return items.map(() => ({
      ...combined,
      cost_usd: combined.cost_usd / n,
      tokens_input: Math.ceil(combined.tokens_input / n),
      tokens_output: Math.ceil(combined.tokens_output / n),
    }));
  }
}
