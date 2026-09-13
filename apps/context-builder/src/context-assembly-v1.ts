export type ContextSourceClass =
  | 'task'
  | 'hard_policy'
  | 'repo'
  | 'workstream_evidence'
  | 'durable_memory'
  | 'recent_conversation';

export type ContextMemoryTier = 'task' | 'session' | 'project' | 'tenant' | 'org';

export type ContextSourceCandidateV1 = {
  source_id: string;
  source_class: ContextSourceClass;
  title: string;
  content: string;
  estimated_tokens: number;
  tenant_slug?: string;
  memory_tier?: ContextMemoryTier;
  retrieved_at: string;
  source_updated_at?: string;
  max_age_seconds?: number;
  contains_secret?: boolean;
  contains_pii?: boolean;
  fingerprint?: string;
};

export type ContextManifestSourceV1 = {
  source_id: string;
  source_class: ContextSourceClass;
  title: string;
  estimated_tokens: number;
  tenant_slug?: string;
  memory_tier?: ContextMemoryTier;
  retrieved_at: string;
  source_updated_at?: string;
  stale: boolean;
  truncated: boolean;
  fingerprint: string;
};

export type ContextAssemblyV1 = {
  schema_version: 'ContextAssemblyV1';
  request_id: string;
  tenant_slug: string;
  token_budget: number;
  used_tokens: number;
  retrieval_performed: true;
  source_order: ContextSourceClass[];
  sources: ContextManifestSourceV1[];
  context: string;
  excluded_sources: Array<{
    source_id: string;
    reason:
      | 'CROSS_TENANT'
      | 'SECRET'
      | 'PII'
      | 'DUPLICATE'
      | 'BUDGET_EXHAUSTED'
      | 'EMPTY';
  }>;
};

export type AssembleContextV1Input = {
  request_id: string;
  tenant_slug: string;
  token_budget: number;
  retrieval_performed: boolean;
  now?: string;
  exclude_pii?: boolean;
  candidates: ContextSourceCandidateV1[];
};

export const CONTEXT_SOURCE_ORDER: ContextSourceClass[] = [
  'task',
  'hard_policy',
  'repo',
  'workstream_evidence',
  'durable_memory',
  'recent_conversation',
];

function nonEmpty(name: string, value: string): string {
  const next = value.trim();
  if (!next) throw new Error(`ContextAssemblyV1 requires ${name}`);
  return next;
}

function sourceRank(sourceClass: ContextSourceClass): number {
  return CONTEXT_SOURCE_ORDER.indexOf(sourceClass);
}

function staleAt(candidate: ContextSourceCandidateV1, nowMs: number): boolean {
  if (!candidate.max_age_seconds || !candidate.source_updated_at) return false;
  const updated = Date.parse(candidate.source_updated_at);
  if (!Number.isFinite(updated)) return true;
  return nowMs - updated > candidate.max_age_seconds * 1000;
}

function fingerprintOf(candidate: ContextSourceCandidateV1): string {
  const explicit = candidate.fingerprint?.trim();
  if (explicit) return explicit;
  return [
    candidate.source_class,
    candidate.tenant_slug ?? '',
    candidate.title.trim(),
    candidate.content.trim(),
  ].join('::');
}

function truncateByTokenBudget(content: string, allowedTokens: number): {
  content: string;
  usedTokens: number;
  truncated: boolean;
} {
  if (allowedTokens <= 0) return { content: '', usedTokens: 0, truncated: true };
  const estimated = Math.max(1, Math.ceil(content.length / 4));
  if (estimated <= allowedTokens) {
    return { content, usedTokens: estimated, truncated: false };
  }
  const maxChars = Math.max(0, allowedTokens * 4);
  return {
    content: content.slice(0, maxChars),
    usedTokens: allowedTokens,
    truncated: true,
  };
}

/**
 * Deterministic, inspectable context assembly.
 * Retrieval must happen before generation; this function only assembles retrieved inputs.
 */
export function assembleContextV1(input: AssembleContextV1Input): ContextAssemblyV1 {
  const requestId = nonEmpty('request_id', input.request_id);
  const tenantSlug = nonEmpty('tenant_slug', input.tenant_slug);
  if (!Number.isInteger(input.token_budget) || input.token_budget <= 0) {
    throw new Error('ContextAssemblyV1 token_budget must be an integer > 0');
  }
  if (input.retrieval_performed !== true) {
    throw new Error(
      'ContextAssemblyV1 requires retrieval_performed=true before generation'
    );
  }

  const nowMs = Date.parse(input.now ?? new Date().toISOString());
  if (!Number.isFinite(nowMs)) throw new Error('ContextAssemblyV1 requires valid now');

  const sorted = [...input.candidates].sort(
    (a, b) =>
      sourceRank(a.source_class) - sourceRank(b.source_class) ||
      a.source_id.localeCompare(b.source_id)
  );

  const excluded: ContextAssemblyV1['excluded_sources'] = [];
  const seen = new Set<string>();
  const manifest: ContextManifestSourceV1[] = [];
  const chunks: string[] = [];
  let usedTokens = 0;

  for (const candidate of sorted) {
    const sourceId = nonEmpty('candidate.source_id', candidate.source_id);
    const raw = candidate.content.trim();
    if (!raw) {
      excluded.push({ source_id: sourceId, reason: 'EMPTY' });
      continue;
    }

    if (candidate.tenant_slug && candidate.tenant_slug !== tenantSlug) {
      excluded.push({ source_id: sourceId, reason: 'CROSS_TENANT' });
      continue;
    }
    if (candidate.contains_secret) {
      excluded.push({ source_id: sourceId, reason: 'SECRET' });
      continue;
    }
    if (input.exclude_pii !== false && candidate.contains_pii) {
      excluded.push({ source_id: sourceId, reason: 'PII' });
      continue;
    }

    const fingerprint = fingerprintOf(candidate);
    if (seen.has(fingerprint)) {
      excluded.push({ source_id: sourceId, reason: 'DUPLICATE' });
      continue;
    }
    seen.add(fingerprint);

    const remaining = input.token_budget - usedTokens;
    if (remaining <= 0) {
      excluded.push({ source_id: sourceId, reason: 'BUDGET_EXHAUSTED' });
      continue;
    }

    const bounded = truncateByTokenBudget(raw, remaining);
    if (!bounded.content) {
      excluded.push({ source_id: sourceId, reason: 'BUDGET_EXHAUSTED' });
      continue;
    }

    chunks.push(
      `<context_source id="${sourceId}" class="${candidate.source_class}" title="${candidate.title.replace(/"/g, '&quot;')}">\n${bounded.content}\n</context_source>`
    );
    usedTokens += bounded.usedTokens;
    manifest.push({
      source_id: sourceId,
      source_class: candidate.source_class,
      title: candidate.title,
      estimated_tokens: bounded.usedTokens,
      tenant_slug: candidate.tenant_slug,
      memory_tier: candidate.memory_tier,
      retrieved_at: candidate.retrieved_at,
      source_updated_at: candidate.source_updated_at,
      stale: staleAt(candidate, nowMs),
      truncated: bounded.truncated,
      fingerprint,
    });
  }

  return {
    schema_version: 'ContextAssemblyV1',
    request_id: requestId,
    tenant_slug: tenantSlug,
    token_budget: input.token_budget,
    used_tokens: usedTokens,
    retrieval_performed: true,
    source_order: [...CONTEXT_SOURCE_ORDER],
    sources: manifest,
    context: chunks.join('\n\n'),
    excluded_sources: excluded,
  };
}
