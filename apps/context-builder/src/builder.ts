import { createClient } from 'redis';
import { getSessionRaw } from './retriever.js';
import { summarizeSession } from './summarizer.js';
import { NamespacedRedis, buildTenantKey } from './lib/redis-namespace-helper.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const SESSION_TTL = 3600;
const CONTEXT_BUILDER_REDIS_NAMESPACE = process.env.CONTEXT_BUILDER_REDIS_NAMESPACE || 'ctx';

export interface SessionContext {
  tenant_slug: string;
  session_id: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  summary?: string;
  metadata?: Record<string, unknown>;
}

let cachedRedisClient: ReturnType<typeof createClient> | null = null;

/**
 * Obtener instancia Redis cacheada.
 */
async function getRedisClient(): Promise<ReturnType<typeof createClient>> {
  if (!cachedRedisClient) {
    cachedRedisClient = createClient({
      url: REDIS_URL,
      password: process.env.REDIS_PASSWORD,
    });
    await cachedRedisClient.connect();
  }
  return cachedRedisClient;
}

/**
 * Obtener NamespacedRedis para un tenant específico.
 */
async function getNamespacedRedis(tenantSlug: string): Promise<NamespacedRedis> {
  const redis = await getRedisClient();
  return new NamespacedRedis(redis, tenantSlug, CONTEXT_BUILDER_REDIS_NAMESPACE);
}

export async function getSessionContext(
  tenantSlug: string,
  sessionId: string
): Promise<SessionContext | null> {
  const ns = await getNamespacedRedis(tenantSlug);
  const raw = await ns.get(`session:${sessionId}`);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as SessionContext;
}

export async function saveSessionContext(ctx: SessionContext): Promise<void> {
  const ns = await getNamespacedRedis(ctx.tenant_slug);

  if (ctx.messages.length > 10) {
    ctx.summary = await summarizeSession(ctx);
    ctx.messages = ctx.messages.slice(-4);
  }

  await ns.setEx(`session:${ctx.session_id}`, SESSION_TTL, JSON.stringify(ctx));
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
  tenant_slug: string;
  session_id: string;
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

  const totalChars =
    messages.reduce((sum, message) => sum + message.content.length, 0) + system.length;
  const estimatedTokens = Math.ceil(totalChars / 4);

  return {
    messages,
    system,
    estimated_tokens: estimatedTokens,
    tenant_slug: tenantSlug,
    session_id: sessionId,
  };
}

/**
 * Guardar RAG (knowledge index) con namespace por tenant.
 */
export async function saveRAG(
  tenantSlug: string,
  ragId: string,
  ragData: Record<string, unknown>
): Promise<void> {
  const ns = await getNamespacedRedis(tenantSlug);
  const ragTTL = 86400 * 30; // 30 días
  await ns.setEx(`rag:${ragId}`, ragTTL, JSON.stringify(ragData));
}

/**
 * Cargar RAG (knowledge index) con namespace por tenant.
 */
export async function loadRAG(
  tenantSlug: string,
  ragId: string
): Promise<Record<string, unknown> | null> {
  const ns = await getNamespacedRedis(tenantSlug);
  const rawData = await ns.get(`rag:${ragId}`);
  if (!rawData) {
    return null;
  }
  try {
    return JSON.parse(rawData) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Listar todos los RAGs para un tenant.
 */
export async function listRAGs(tenantSlug: string): Promise<string[]> {
  const ns = await getNamespacedRedis(tenantSlug);
  const ragIds = await ns.keys('rag:*');
  return ragIds.map((id) => id.replace('rag:', ''));
}

/**
 * Eliminar RAG con namespace por tenant.
 */
export async function deleteRAG(tenantSlug: string, ragId: string): Promise<void> {
  const ns = await getNamespacedRedis(tenantSlug);
  await ns.del(`rag:${ragId}`);
}
