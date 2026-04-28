import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { v4 as randomUUID } from 'uuid';

export interface ResearchExecutionPayload {
  query: string;
  tenant_slug: string;
  request_id: string;
  depth?: 'fast' | 'standard' | 'deep';
  topic_context?: string;
  initiated_by: string;
}

async function llmCall(prompt: string, model: string, maxTokens: number): Promise<string> {
  const response = await fetch(`${process.env.ORCHESTRATOR_LLM_GATEWAY_URL || 'http://llm-gateway:3010'}/v1/text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY || ''}`,
    },
    body: JSON.stringify({
      prompt,
      model,
      max_tokens: maxTokens,
    }),
  });

  const data = (await response.json()) as { text?: string; error?: string };
  if (data.error) {
    throw new Error(`LLM call failed: ${data.error}`);
  }

  return data.text || '';
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

async function tavilySearch(query: string, maxResults: number): Promise<TavilyResult[]> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: maxResults,
      topic: 'general',
    }),
  });

  const data = (await response.json()) as { results?: TavilyResult[] };
  return data.results || [];
}

function calculateRelevance(result: TavilyResult, query: string, context?: string): number {
  let score = result.score ?? 0.5;

  const queryWords = query.toLowerCase().split(/\s+/);
  const titleMatches = queryWords.filter((w) => result.title.toLowerCase().includes(w)).length;
  score += (titleMatches / queryWords.length) * 0.2;

  const contentLength = result.content?.length ?? 0;
  score += Math.min(contentLength / 2000, 0.1);

  if (context) {
    const contextWords = context.toLowerCase().split(/\s+/);
    const contextMatches = contextWords.filter((w) => result.content.toLowerCase().includes(w)).length;
    score += (contextMatches / contextWords.length) * 0.1;
  }

  return Math.min(score, 1.0);
}

export async function processResearchJob(job: Job<ResearchExecutionPayload>): Promise<unknown> {
  const { query, tenant_slug, request_id, depth = 'standard', topic_context, initiated_by } = job.data;
  const researchRunId = randomUUID();

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const startTime = Date.now();

  await supabase.from('research_artifacts').insert({
    research_run_id: researchRunId,
    tenant_slug,
    request_id,
    query,
    depth,
    topic_context,
    status: 'started',
    initiated_by,
  });

  try {
    const maxResults = depth === 'fast' ? 3 : depth === 'standard' ? 7 : 15;
    const tavilyResults = await tavilySearch(query, maxResults);

    interface ScoredResult extends TavilyResult {
      relevance_score: number;
    }

    const scoredResults: ScoredResult[] = tavilyResults
      .map((r) => ({
        ...r,
        relevance_score: calculateRelevance(r, query, topic_context),
      }))
      .sort((a, b) => b.relevance_score - a.relevance_score);

    const top3 = scoredResults.slice(0, 3);
    const synthesisPrompt = `
Basándote en los siguientes resultados de investigación sobre: "${query}"
${topic_context ? `Contexto adicional: ${topic_context}` : ''}

Resultados:
${top3.map((r) => `- ${r.title} (${r.url})\n  ${r.content.substring(0, 200)}...`).join('\n')}

Genera un resumen estructurado (2-3 párrafos) que responda a la query de forma concisa.
Incluye al final una sección "Evidencia" con los URLs.
Formato: texto plano, sin markdown.
    `;

    const synthesis = await llmCall(synthesisPrompt, 'claude-haiku-4-5-20251001', 300);

    const duration = Date.now() - startTime;
    const avgRelevance = scoredResults.length > 0 ? scoredResults.reduce((acc, r) => acc + r.relevance_score, 0) / scoredResults.length : 0;

    await supabase.from('research_artifacts').update({
      status: 'completed',
      sources: scoredResults,
      synthesis,
      source_count: scoredResults.length,
      avg_relevance_score: avgRelevance,
      duration_ms: duration,
      completed_at: new Date().toISOString(),
    });

    return {
      success: true,
      researchRunId,
      sourceCount: scoredResults.length,
      avgRelevance: avgRelevance,
    };
  } catch (err) {
    const duration = Date.now() - startTime;

    await supabase.from('research_artifacts').update({
      status: 'failed',
      error: String(err),
      duration_ms: duration,
      completed_at: new Date().toISOString(),
    });

    throw err;
  }
}

export function createResearchWorker(connection: any): Worker {
  return new Worker('openclaw', processResearchJob, {
    connection,
    concurrency: 2,
  });
}
