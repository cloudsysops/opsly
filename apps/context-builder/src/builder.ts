import { createClient } from 'redis';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSessionRaw } from './retriever.js';
import { summarizeSession } from './summarizer.js';
import { createHash } from 'crypto';

// TODO (Sprint 9): Integrate NotebookLM query when notebooklm-agent module is ready
// import { getCachedQuery } from '@intcloudsysops/notebooklm-agent';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const SESSION_TTL = 3600;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export interface SessionContext {
  tenant_slug: string;
  session_id: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export async function getSessionContext(
  tenantSlug: string,
  sessionId: string
): Promise<SessionContext | null> {
  const raw = await getSessionRaw(tenantSlug, sessionId);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as SessionContext;
}

export async function saveSessionContext(ctx: SessionContext): Promise<void> {
  const redis = createClient({
    url: REDIS_URL,
    password: process.env.REDIS_PASSWORD,
  });

  await redis.connect();
  const key = `tenant:${ctx.tenant_slug}:session:${ctx.session_id}`;

  if (ctx.messages.length > 10) {
    ctx.summary = await summarizeSession(ctx);
    ctx.messages = ctx.messages.slice(-4);
  }

  await redis.setEx(key, SESSION_TTL, JSON.stringify(ctx));
  await redis.disconnect();
}

/**
 * Genera un hash para una query (usado para cacheo de NotebookLM)
 */
function generateQueryHash(query: string): string {
  return createHash('sha256').update(query).digest('hex');
}

/**
 * Consulta NotebookLM Knowledge Layer
 * Retorna contexto enriquecido de fuentes indexadas
 */
async function queryNotebookLMContext(
  tenantSlug: string,
  query: string
): Promise<{ context: string; sources: Array<{ title: string; url?: string }>; confidence: number } | null> {
  try {
    // Crear cliente Supabase con service role
    const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const queryHash = generateQueryHash(query);

    // TODO (Sprint 9): Integrate NotebookLM query caching
    // For now, skip NotebookLM integration and use RAG local

    // 1. Si no hay cache valido, intentar NotebookLM
    // (En producción, esto llamaría al Python client vía MCP)
    // Por ahora retornar null para fallback a RAG local
    return null;
  } catch (err) {
    console.warn('Failed to query NotebookLM context:', err);
    // Fallback a RAG local
    return null;
  }
}

export async function buildContextForLLM(
  tenantSlug: string,
  sessionId: string,
  newMessage: string,
  systemPrompt?: string
): Promise<{
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  system: string;
  estimated_tokens: number;
  knowledge_context?: { context: string; sources: Array<{ title: string; url?: string }> };
}> {
  const session = await getSessionContext(tenantSlug, sessionId);

  let messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  let system = systemPrompt || '';

  if (session) {
    if (session.summary) {
      system += `\n\nResumen de conversación previa:\n${session.summary}`;
    }
    messages = [...session.messages];
  }

  messages.push({ role: 'user', content: newMessage });

  // Consultar Knowledge Layer (NotebookLM)
  let knowledgeContext = null;
  try {
    knowledgeContext = await queryNotebookLMContext(tenantSlug, newMessage);
    if (knowledgeContext) {
      system += `\n\nContexto de Knowledge Base (NotebookLM):\n${knowledgeContext.context}`;
      if (knowledgeContext.sources.length > 0) {
        system += '\n\nFuentes:\n' +
          knowledgeContext.sources.map((s: any) => `- ${s.title}${s.url ? ` (${s.url})` : ''}`).join('\n');
      }
    }
  } catch (err) {
    console.warn('Knowledge Layer query failed, continuing without context:', err);
  }

  const totalChars =
    messages.reduce((sum, message) => sum + message.content.length, 0) + system.length;
  const estimatedTokens = Math.ceil(totalChars / 4);

  return {
    messages,
    system,
    estimated_tokens: estimatedTokens,
    knowledge_context: knowledgeContext || undefined,
  };
}
