import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { embedText } from './embeddings.js';
import { getRedisClient } from './cache.js';
import { platformSchema, supabaseRpc } from './supabase-helpers.js';
import type { DetectedIntent } from './types.js';

const execFileP = promisify(execFile);

const SOURCE_TIMEOUT_MS = 3000;

/** Valor de carrera cuando vence el temporizador (no confundir con null legítimo p.ej. tenant inexistente). */
const WITH_TIMEOUT_DEADLINE = Symbol('withTimeoutDeadline');

/** promisify(execFile) real devuelve { stdout, stderr }; promisify de un mock genérico devuelve solo stdout. */
function execFileStdout(result: unknown): string {
  if (typeof result === 'string') {
    return result;
  }
  if (Buffer.isBuffer(result)) {
    return result.toString('utf8');
  }
  if (typeof result === 'object' && result !== null && 'stdout' in result) {
    const raw = (result as { stdout: string | Buffer }).stdout;
    if (Buffer.isBuffer(raw)) {
      return raw.toString('utf8');
    }
    return raw === undefined || raw === null ? '' : String(raw);
  }
  return '';
}

export interface RepoSnippet {
  paths: string[];
}

export interface SessionHistoryItem {
  session_id: string;
  preview: string;
}

export interface FeedbackExample {
  reasoning: string;
  implementation_prompt: string | null;
}

export interface TenantInfoRow {
  slug: string;
  plan: string;
  owner_email: string;
  services: Record<string, unknown> | null;
}

export interface RagChunk {
  id: string;
  content: string;
  similarity: number;
}

export interface EnrichedContext {
  repo: RepoSnippet;
  sessions: SessionHistoryItem[];
  feedback: FeedbackExample[];
  tenant: TenantInfoRow | null;
  rag: RagChunk[];
  errors: string[];
}

function monorepoRoot(): string {
  return process.env.OPS_REPO_ROOT?.trim() || process.cwd();
}

function keywordsFromMessage(message: string): string[] {
  const stop = new Set([
    'the',
    'and',
    'for',
    'que',
    'con',
    'los',
    'las',
    'una',
    'this',
    'with',
    'from',
  ]);
  return message
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3 && !stop.has(w))
    .slice(0, 5);
}

async function withTimeout<T>(
  p: Promise<T>,
  ms: number
): Promise<T | typeof WITH_TIMEOUT_DEADLINE> {
  let t: NodeJS.Timeout;
  const deadline = new Promise<typeof WITH_TIMEOUT_DEADLINE>((resolve) => {
    t = setTimeout(() => resolve(WITH_TIMEOUT_DEADLINE), ms);
  });
  try {
    return await Promise.race([p, deadline]);
  } finally {
    clearTimeout(t!);
  }
}

async function searchRepoContext(message: string): Promise<RepoSnippet> {
  const root = monorepoRoot();
  const keys = keywordsFromMessage(message);
  const paths = new Set<string>();
  for (const kw of keys) {
    try {
      const execResult = await execFileP(
        'rg',
        ['-l', '--max-count', '3', kw, `${root}/apps`, `${root}/scripts`, `${root}/infra`],
        { timeout: SOURCE_TIMEOUT_MS - 200, maxBuffer: 2_000_000 }
      );
      const stdout = execFileStdout(execResult);
      stdout
        .split('\n')
        .filter(Boolean)
        .slice(0, 6)
        .forEach((p) => paths.add(p));
    } catch {
      /* rg exit 1 = no matches */
    }
  }
  return { paths: [...paths].slice(0, 12) };
}

async function getSessionHistory(tenant_slug: string): Promise<SessionHistoryItem[]> {
  try {
    const redis = await getRedisClient();
    const key = `tenant:${tenant_slug}:llm:recent_sessions`;
    const raw = await redis.lRange(key, 0, 4);
    return raw.map((preview, i) => ({
      session_id: `idx-${i}`,
      preview: preview.slice(0, 500),
    }));
  } catch {
    return [];
  }
}

function getSupabase(): ReturnType<typeof createSupabaseClient> | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return null;
  }
  return createSupabaseClient(url, key);
}

async function searchSimilarFeedback(tenant_slug: string): Promise<FeedbackExample[]> {
  const sb = getSupabase();
  if (!sb) {
    return [];
  }
  const { data: convs } = await platformSchema(sb)
    .from('feedback_conversations')
    .select('id')
    .eq('tenant_slug', tenant_slug)
    .limit(80);

  const ids = (convs ?? []).map((c: { id: string }) => c.id);
  if (ids.length === 0) {
    return [];
  }

  const { data: decs } = await platformSchema(sb)
    .from('feedback_decisions')
    .select('reasoning, implementation_prompt')
    .in('conversation_id', ids)
    .eq('decision_type', 'auto_implement')
    .not('implemented_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);

  return (decs ?? []) as FeedbackExample[];
}

async function getTenantInfo(tenant_slug: string): Promise<TenantInfoRow | null> {
  const sb = getSupabase();
  if (!sb) {
    return null;
  }
  const { data } = await platformSchema(sb)
    .from('tenants')
    .select('slug, plan, owner_email, services')
    .eq('slug', tenant_slug)
    .maybeSingle();
  return data as TenantInfoRow | null;
}

async function ragSearch(tenant_slug: string, message: string): Promise<RagChunk[]> {
  const sb = getSupabase();
  if (!sb) {
    return [];
  }
  const vec = await embedText(message);
  if (!vec) {
    return [];
  }
  const { data, error } = await supabaseRpc<RagChunk[]>(sb, 'match_tenant_embeddings', {
    query_embedding: vec,
    match_threshold: 0.72,
    match_count: 5,
    p_tenant_slug: tenant_slug,
  });
  if (error || !data) {
    return [];
  }
  return (Array.isArray(data) ? data : []).slice(0, 5);
}

export async function enrichContext(
  tenant_slug: string,
  userMessage: string,
  _intent: DetectedIntent
): Promise<EnrichedContext> {
  const errors: string[] = [];

  const settled = await Promise.allSettled([
    withTimeout(searchRepoContext(userMessage), SOURCE_TIMEOUT_MS).then((r) => {
      if (r === WITH_TIMEOUT_DEADLINE) {
        errors.push('repo:timeout');
        return { paths: [] as string[] };
      }
      return r;
    }),
    withTimeout(getSessionHistory(tenant_slug), SOURCE_TIMEOUT_MS).then((r) => {
      if (r === WITH_TIMEOUT_DEADLINE) {
        errors.push('sessions:timeout');
        return [];
      }
      return r;
    }),
    withTimeout(searchSimilarFeedback(tenant_slug), SOURCE_TIMEOUT_MS).then((r) => {
      if (r === WITH_TIMEOUT_DEADLINE) {
        errors.push('feedback:timeout');
        return [];
      }
      return r;
    }),
    withTimeout(getTenantInfo(tenant_slug), SOURCE_TIMEOUT_MS).then((r) => {
      if (r === WITH_TIMEOUT_DEADLINE) {
        errors.push('tenant:timeout');
        return null;
      }
      return r;
    }),
    withTimeout(ragSearch(tenant_slug, userMessage), SOURCE_TIMEOUT_MS).then((r) => {
      if (r === WITH_TIMEOUT_DEADLINE) {
        errors.push('rag:timeout');
        return [];
      }
      return r;
    }),
  ]);

  const repo: RepoSnippet =
    settled[0].status === 'fulfilled' && settled[0].value ? settled[0].value : { paths: [] };
  const sessions: SessionHistoryItem[] =
    settled[1].status === 'fulfilled' && settled[1].value ? settled[1].value : [];
  const feedback: FeedbackExample[] =
    settled[2].status === 'fulfilled' && settled[2].value ? settled[2].value : [];
  const tenant: TenantInfoRow | null = settled[3].status === 'fulfilled' ? settled[3].value : null;
  const rag: RagChunk[] =
    settled[4].status === 'fulfilled' && settled[4].value ? settled[4].value : [];

  settled.forEach((s, i) => {
    if (s.status === 'rejected') {
      errors.push(`source_${i}:${s.reason instanceof Error ? s.reason.message : String(s.reason)}`);
    }
  });

  return {
    repo,
    sessions,
    feedback,
    tenant,
    rag,
    errors,
  };
}
