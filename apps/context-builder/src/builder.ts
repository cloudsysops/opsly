import { createClient } from 'redis';
import { getSessionRaw } from './retriever.js';
import { summarizeSession } from './summarizer.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const SESSION_TTL = 3600;

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

export async function buildContextForLLM(
  tenantSlug: string,
  sessionId: string,
  newMessage: string,
  systemPrompt?: string
): Promise<{
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  system: string;
  estimated_tokens: number;
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
  };
}
