import { executeNotebookLM } from '@intcloudsysops/notebooklm-agent';
import type { NotebookQueryResponse } from '@intcloudsysops/types';

const TIMEOUT_MS = 30_000;

function tenant(): string {
  return process.env.NOTEBOOKLM_DEFAULT_TENANT_SLUG?.trim() || 'platform';
}

function notebookId(): string | undefined {
  const id = process.env.NOTEBOOKLM_NOTEBOOK_ID?.trim();
  return id && id.length > 0 ? id : undefined;
}

function enabled(): boolean {
  return process.env.NOTEBOOKLM_ENABLED?.trim().toLowerCase() === 'true';
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`NotebookLM timeout ${String(ms)}ms`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function queryNotebookLmForApi(
  question: string,
  context?: string
): Promise<NotebookQueryResponse> {
  if (!enabled() || !notebookId()) {
    return {
      answer: '',
      sources: [],
      confidence: 0,
    };
  }
  const nb = notebookId() as string;
  const full = context && context.length > 0 ? `${question}\n\nContexto:\n${context}` : question;
  const t0 = Date.now();
  const result = await withTimeout(
    executeNotebookLM({
      action: 'ask',
      tenant_slug: tenant(),
      notebook_id: nb,
      question: full,
    }),
    TIMEOUT_MS
  );
  if (!result.success || result.answer === undefined) {
    return {
      answer: '',
      sources: [],
      confidence: 0,
      latency_ms: Date.now() - t0,
    };
  }
  return {
    answer: result.answer,
    sources: [],
    confidence: 0.85,
    latency_ms: Date.now() - t0,
  };
}
