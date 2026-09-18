import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import type { RedisClientType } from 'redis';
import { requireAdminAccess } from '../../../../../lib/auth';
import { proxyRuntimeOrchestrator } from '../../../../../lib/runtime-proxy';

const CLAIM_PREFIX = 'opsly:dispatch-claim:v1';
const GITHUB_CACHE_MS = 120_000;
const MAX_ENRICHED_PULLS = 20;

type ClaimDescriptor = {
  dimension: 'task' | 'conflict' | 'semantic' | 'path' | string;
  value: string;
};

type DispatchClaimSnapshot = {
  claim_id: string;
  work_id: string;
  workstream: string | null;
  owner: string | null;
  state: 'active';
  conflict_key: string | null;
  semantic_scope: string | null;
  affected_paths: string[];
};

type VerificationState = 'PASS' | 'FAIL' | 'BLOCKED' | 'UNKNOWN';
type MergeReadiness = 'READY' | 'BLOCKED' | 'UNKNOWN';

type RuntimeSessionSnapshot = {
  session_id: string;
  work_id: string | null;
  agent_id: string;
  status:
    | 'created'
    | 'running'
    | 'checkpointed'
    | 'waiting_approval'
    | 'stopped'
    | 'failed'
    | 'resumable'
    | 'unknown';
  branch: string | null;
  last_seen_at: string | null;
};

type GitHubWorkItem = {
  work_id: string;
  agent_id: string | null;
  workstream: string | null;
  conflict_key: string | null;
  transport: 'autonomous' | 'human_relay' | 'unknown';
  pr_number: number;
  pr_url: string;
  branch: string;
  head_sha: string;
  title: string;
  draft: boolean;
  verifier: VerificationState;
  merge_readiness: MergeReadiness;
  check_state: 'PASS' | 'FAIL' | 'PENDING' | 'UNKNOWN';
  mergeable: boolean | null;
  protection_state: 'CLEAR' | 'PROTECTED' | 'UNKNOWN';
  blocker: string | null;
};

type Marker = {
  work_id?: unknown;
  agent_id?: unknown;
  workstream?: unknown;
  conflict_key?: unknown;
  transport?: unknown;
};

let githubCache: {
  expires_at: number;
  observed: boolean;
  complete: boolean;
  items: GitHubWorkItem[];
  error?: string;
} | null = null;

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function githubHeaders(): HeadersInit {
  const token =
    process.env.GITHUB_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN_N8N?.trim() ||
    process.env.GH_TOKEN?.trim();
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function githubRepository(): string {
  return process.env.GITHUB_REPOSITORY?.trim() || 'cloudsysops/opsly';
}

async function readProtectionPatterns(): Promise<string[] | null> {
  const cwd = process.cwd();
  const repoRoot = process.env.OPSLY_REPO_ROOT?.trim();
  const candidates = [...(repoRoot ? [repoRoot] : []), cwd, join(cwd, '..'), join(cwd, '..', '..')];
  for (const root of candidates) {
    const file = join(root, 'config', 'pr-reconciliation-policy.json');
    if (!existsSync(file)) continue;
    try {
      const parsed = JSON.parse(await readFile(file, 'utf8')) as {
        protected?: { patterns?: unknown };
      };
      if (!Array.isArray(parsed.protected?.patterns)) return null;
      const patterns = parsed.protected.patterns
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.toLowerCase());
      return patterns.length > 0 ? patterns : null;
    } catch {
      return null;
    }
  }
  return null;
}

function protectionState(
  files: Array<Record<string, unknown>>,
  patterns: string[] | null,
  filesComplete: boolean
): GitHubWorkItem['protection_state'] {
  if (!patterns || !filesComplete) return 'UNKNOWN';
  const filenames = files
    .map((file) => asString(file.filename))
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());

  return patterns.some((pattern) => filenames.some((filename) => filename.includes(pattern)))
    ? 'PROTECTED'
    : 'CLEAR';
}

async function githubJson(path: string): Promise<unknown> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: githubHeaders(),
    signal: AbortSignal.timeout(5000),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} for ${path}`);
  }
  return response.json();
}

async function githubPagedArray(
  path: string,
  expectedCount: number | null = null
): Promise<{ items: Array<Record<string, unknown>>; complete: boolean }> {
  const items: Array<Record<string, unknown>> = [];
  for (let page = 1; page <= 20; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const raw = await githubJson(`${path}${separator}per_page=100&page=${page}`);
    if (!Array.isArray(raw)) {
      throw new Error(`GitHub API returned non-array page for ${path}`);
    }
    const batch = raw.filter(
      (item): item is Record<string, unknown> => typeof item === 'object' && item !== null
    );
    if (batch.length !== raw.length) {
      throw new Error(`GitHub API returned malformed array item for ${path}`);
    }
    items.push(...batch);
    if (expectedCount !== null && items.length >= expectedCount) {
      return { items, complete: items.length === expectedCount };
    }
    if (batch.length < 100) {
      return {
        items,
        complete: expectedCount === null ? true : items.length === expectedCount,
      };
    }
  }
  return { items, complete: false };
}

function parseEvidenceMarker(body: string): Marker | null {
  const match = body.match(/<!--\s*opsly-work-evidence-v1\s*([\s\S]*?)-->/i);
  if (!match?.[1]) return null;
  try {
    const parsed = JSON.parse(match[1].trim()) as Marker;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function fallbackBodyField(body: string, label: string): string | null {
  const pattern = new RegExp('(?:^|\\n)-?\\s*' + label + ':\\s*`?([^\\n`]+)`?', 'i');
  return body.match(pattern)?.[1]?.trim() || null;
}

function fallbackWorkId(body: string): string | null {
  return fallbackBodyField(body, 'Task-Id') || fallbackBodyField(body, 'Work ID');
}

function fallbackTransport(body: string): GitHubWorkItem['transport'] {
  if (/Dispatch-Claim:\s*(?!none\b)[^\n]+/i.test(body)) return 'autonomous';
  return 'unknown';
}
function checkState(
  statusPayload: Record<string, unknown> | null,
  checksPayload: Record<string, unknown> | null
): GitHubWorkItem['check_state'] {
  const statuses = Array.isArray(statusPayload?.statuses)
    ? (statusPayload?.statuses as Array<Record<string, unknown>>)
    : [];
  const checks = Array.isArray(checksPayload?.check_runs)
    ? (checksPayload?.check_runs as Array<Record<string, unknown>>)
    : [];
  const totalChecks =
    typeof checksPayload?.total_count === 'number' ? checksPayload.total_count : checks.length;
  if (totalChecks > checks.length) return 'UNKNOWN';

  const statusStates = statuses
    .map((item) => asString(item.state)?.toLowerCase())
    .filter(Boolean) as string[];
  const relevantChecks = checks.filter((item) => {
    const conclusion = asString(item.conclusion)?.toLowerCase();
    return conclusion !== 'skipped' && conclusion !== 'neutral';
  });

  if (
    statusStates.some((state) => state === 'failure' || state === 'error') ||
    relevantChecks.some((item) =>
      ['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure'].includes(
        asString(item.conclusion)?.toLowerCase() || ''
      )
    )
  ) {
    return 'FAIL';
  }

  if (
    statusStates.some((state) => state === 'pending') ||
    relevantChecks.some((item) => asString(item.status)?.toLowerCase() !== 'completed')
  ) {
    return 'PENDING';
  }

  if (statusStates.length > 0 || relevantChecks.length > 0) return 'PASS';
  return 'UNKNOWN';
}

function verifierState(
  statusPayload: Record<string, unknown> | null,
  checksPayload: Record<string, unknown> | null
): VerificationState {
  const statuses = Array.isArray(statusPayload?.statuses)
    ? (statusPayload?.statuses as Array<Record<string, unknown>>)
    : [];
  const checks = Array.isArray(checksPayload?.check_runs)
    ? (checksPayload?.check_runs as Array<Record<string, unknown>>)
    : [];

  const status = statuses.find(
    (item) => asString(item.context)?.toLowerCase() === 'opsly-independent-review'
  );
  if (status) {
    const state = asString(status.state)?.toLowerCase();
    if (state === 'success') return 'PASS';
    if (state === 'failure' || state === 'error') return 'BLOCKED';
    return 'UNKNOWN';
  }

  const check = checks.find(
    (item) => asString(item.name)?.toLowerCase() === 'opsly-independent-review'
  );
  if (check) {
    const conclusion = asString(check.conclusion)?.toLowerCase();
    if (conclusion === 'success') return 'PASS';
    if (conclusion && conclusion !== 'neutral' && conclusion !== 'skipped') return 'BLOCKED';
  }

  return 'UNKNOWN';
}

function mergeDecision(input: {
  draft: boolean;
  mergeable: boolean | null;
  mergeableState: string | null;
  verifier: VerificationState;
  checks: GitHubWorkItem['check_state'];
  protection: GitHubWorkItem['protection_state'];
}): { readiness: MergeReadiness; blocker: string | null } {
  if (input.protection === 'PROTECTED') {
    return { readiness: 'BLOCKED', blocker: 'protected surface requires Sierra policy approval' };
  }
  if (input.protection === 'UNKNOWN') {
    return { readiness: 'UNKNOWN', blocker: 'canonical protected-surface evidence is unavailable' };
  }
  if (input.draft) return { readiness: 'BLOCKED', blocker: 'draft pull request' };
  if (input.mergeable === false || input.mergeableState === 'dirty') {
    return { readiness: 'BLOCKED', blocker: 'pull request has merge conflicts' };
  }
  if (input.mergeableState === 'blocked') {
    return { readiness: 'BLOCKED', blocker: 'GitHub reports the pull request is blocked' };
  }
  if (input.mergeableState !== 'clean') {
    return {
      readiness: 'UNKNOWN',
      blocker: `GitHub merge state is not clean: ${input.mergeableState || 'unknown'}`,
    };
  }
  if (input.verifier === 'BLOCKED' || input.verifier === 'FAIL') {
    return { readiness: 'BLOCKED', blocker: 'independent verifier is not passing' };
  }
  if (input.checks === 'FAIL') {
    return { readiness: 'BLOCKED', blocker: 'one or more required checks are failing' };
  }
  if (input.verifier === 'PASS' && input.checks === 'PASS' && input.mergeable === true) {
    return { readiness: 'READY', blocker: null };
  }
  if (input.verifier === 'UNKNOWN') {
    return { readiness: 'UNKNOWN', blocker: 'independent verifier evidence is not present' };
  }
  if (input.checks === 'PENDING' || input.checks === 'UNKNOWN') {
    return { readiness: 'UNKNOWN', blocker: 'checks are pending or unavailable' };
  }
  return { readiness: 'UNKNOWN', blocker: 'mergeability evidence is incomplete' };
}

async function readGithubWork(): Promise<{
  observed: boolean;
  complete: boolean;
  items: GitHubWorkItem[];
  error?: string;
}> {
  if (githubCache && githubCache.expires_at > Date.now()) {
    return {
      observed: githubCache.observed,
      complete: githubCache.complete,
      items: githubCache.items,
      ...(githubCache.error ? { error: githubCache.error } : {}),
    };
  }

  try {
    const repository = githubRepository();
    const protectionPatterns = await readProtectionPatterns();
    const pullsRaw = await githubJson(
      `/repos/${repository}/pulls?state=open&sort=updated&direction=desc&per_page=100`
    );
    const pulls = Array.isArray(pullsRaw) ? (pullsRaw as Array<Record<string, unknown>>) : [];

    const matchedCandidates = pulls
      .map((pull) => {
        const body = asString(pull.body) || '';
        const marker = parseEvidenceMarker(body);
        const head =
          typeof pull.head === 'object' && pull.head !== null
            ? (pull.head as Record<string, unknown>)
            : {};
        const workId = asString(marker?.work_id) || fallbackWorkId(body);
        const branch = asString(head.ref);
        if (!workId && !branch?.startsWith('agent/')) return null;
        return { pull, body, marker, workId: workId || `pr:${String(pull.number)}`, head, branch };
      })
      .filter((value): value is NonNullable<typeof value> => value !== null);

    const githubEvidenceComplete =
      pulls.length < 100 && matchedCandidates.length <= MAX_ENRICHED_PULLS;
    const candidates = matchedCandidates.slice(0, MAX_ENRICHED_PULLS);

    const canEnrich = Boolean(
      process.env.GITHUB_TOKEN?.trim() ||
      process.env.GITHUB_TOKEN_N8N?.trim() ||
      process.env.GH_TOKEN?.trim()
    );

    const items = await Promise.all(
      candidates.map(async ({ pull, body, marker, workId, head, branch }) => {
        const headSha = asString(head.sha) || '';
        let detail: Record<string, unknown> | null = null;
        let statusPayload: Record<string, unknown> | null = null;
        let checksPayload: Record<string, unknown> | null = null;
        let files: Array<Record<string, unknown>> = [];
        let filesObserved = false;
        let filesComplete = false;
        let enrichmentComplete = false;

        if (canEnrich && headSha) {
          const [detailResult, statusResult, checksResult] = await Promise.allSettled([
            githubJson(`/repos/${repository}/pulls/${String(pull.number)}`),
            githubJson(`/repos/${repository}/commits/${headSha}/status`),
            githubJson(`/repos/${repository}/commits/${headSha}/check-runs?per_page=100`),
          ]);
          detail =
            detailResult.status === 'fulfilled' &&
            typeof detailResult.value === 'object' &&
            detailResult.value !== null
              ? (detailResult.value as Record<string, unknown>)
              : null;
          statusPayload =
            statusResult.status === 'fulfilled' &&
            typeof statusResult.value === 'object' &&
            statusResult.value !== null
              ? (statusResult.value as Record<string, unknown>)
              : null;
          checksPayload =
            checksResult.status === 'fulfilled' &&
            typeof checksResult.value === 'object' &&
            checksResult.value !== null
              ? (checksResult.value as Record<string, unknown>)
              : null;
          enrichmentComplete =
            detailResult.status === 'fulfilled' &&
            statusResult.status === 'fulfilled' &&
            checksResult.status === 'fulfilled';

          const changedFiles =
            typeof detail?.changed_files === 'number' ? detail.changed_files : null;
          if (protectionPatterns && changedFiles !== null) {
            try {
              const filesResult = await githubPagedArray(
                `/repos/${repository}/pulls/${String(pull.number)}/files`,
                changedFiles
              );
              filesObserved = true;
              files = filesResult.items;
              filesComplete = filesResult.complete;
            } catch {
              filesObserved = false;
              filesComplete = false;
            }
          }
        }

        const checks = checkState(statusPayload, checksPayload);
        const verifier = verifierState(statusPayload, checksPayload);
        const mergeable = typeof detail?.mergeable === 'boolean' ? detail.mergeable : null;
        const mergeableState = asString(detail?.mergeable_state);
        const draft = pull.draft === true;
        const protection =
          canEnrich && protectionPatterns
            ? protectionState(files, protectionPatterns, filesObserved && filesComplete)
            : ('UNKNOWN' as const);
        const merge = mergeDecision({
          draft,
          mergeable,
          mergeableState,
          verifier,
          checks,
          protection,
        });

        const markerTransport = asString(marker?.transport);
        const transport: GitHubWorkItem['transport'] =
          markerTransport === 'human_relay' || markerTransport === 'autonomous'
            ? markerTransport
            : fallbackTransport(body);

        return {
          item: {
            work_id: workId,
            agent_id: asString(marker?.agent_id) || fallbackBodyField(body, 'Worker'),
            workstream: asString(marker?.workstream) || fallbackBodyField(body, 'Workstream'),
            conflict_key: asString(marker?.conflict_key) || fallbackBodyField(body, 'Conflict-Key'),
            transport,
            pr_number: Number(pull.number),
            pr_url: asString(pull.html_url) || '',
            branch: branch || '',
            head_sha: headSha,
            title: asString(pull.title) || `PR #${String(pull.number)}`,
            draft,
            verifier,
            merge_readiness: merge.readiness,
            check_state: checks,
            mergeable,
            protection_state: protection,
            blocker: merge.blocker,
          } satisfies GitHubWorkItem,
          complete: enrichmentComplete && (!protectionPatterns || (filesObserved && filesComplete)),
        };
      })
    );

    const enrichedItems = items.map((result) => result.item);
    const enrichmentEvidenceComplete = items.every((result) => result.complete);

    githubCache = {
      expires_at: Date.now() + GITHUB_CACHE_MS,
      observed: true,
      complete: githubEvidenceComplete && enrichmentEvidenceComplete,
      items: enrichedItems,
    };
    return {
      observed: true,
      complete: githubEvidenceComplete && enrichmentEvidenceComplete,
      items: enrichedItems,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    githubCache = {
      expires_at: Date.now() + 15_000,
      observed: false,
      complete: false,
      items: [],
      error: message,
    };
    return { observed: false, complete: false, items: [], error: message };
  }
}

async function readRuntimeSessions(): Promise<{
  observed: boolean;
  sessions: RuntimeSessionSnapshot[];
  error?: string;
}> {
  try {
    const response = await proxyRuntimeOrchestrator('/internal/runtime/sessions', {
      method: 'GET',
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`runtime sessions ${response.status}: ${detail.slice(0, 200)}`);
    }
    const payload = (await response.json()) as {
      ok?: unknown;
      sessions?: unknown;
    };
    if (payload.ok !== true || !Array.isArray(payload.sessions)) {
      throw new Error('runtime sessions returned an invalid payload');
    }

    const sessions = payload.sessions.map((raw): RuntimeSessionSnapshot => {
      if (typeof raw !== 'object' || raw === null) {
        throw new Error('runtime sessions contained a malformed entry');
      }
      const item = raw as Record<string, unknown>;
      const sessionId = asString(item.sessionId);
      const agentId = asString(item.agentId);
      if (!sessionId || !agentId) {
        throw new Error('runtime sessions contained an entry without sessionId/agentId');
      }
      const rawStatus = asString(item.status) || 'unknown';
      const known = new Set([
        'created',
        'running',
        'checkpointed',
        'waiting_approval',
        'stopped',
        'failed',
        'resumable',
      ]);
      return {
        session_id: sessionId,
        work_id: asString(item.jobId),
        agent_id: agentId,
        status: known.has(rawStatus) ? (rawStatus as RuntimeSessionSnapshot['status']) : 'unknown',
        branch: asString(item.branch),
        last_seen_at: asString(item.lastSeenAt),
      };
    });

    return { observed: true, sessions };
  } catch (error) {
    return {
      observed: false,
      sessions: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function createRedis(): Promise<RedisClientType> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) throw new Error('REDIS_URL is not configured');
  const { createClient } = await import('redis');
  return createClient({ url }) as RedisClientType;
}

function parseClaimValue(value: string): {
  claim_id: string;
  task_id: string | null;
  workstream: string | null;
  owner: string | null;
  state: 'active' | 'completed';
  descriptor: ClaimDescriptor | null;
} | null {
  const separator = value.indexOf('|');
  if (separator <= 0) return null;
  const claimId = value.slice(0, separator);
  try {
    const payload = JSON.parse(value.slice(separator + 1)) as Record<string, unknown>;
    const descriptor =
      typeof payload.descriptor === 'object' && payload.descriptor !== null
        ? (payload.descriptor as Record<string, unknown>)
        : null;
    const dimension = asString(descriptor?.dimension);
    const descriptorValue = asString(descriptor?.value);
    return {
      claim_id: claimId,
      task_id: asString(payload.task_id),
      workstream: asString(payload.workstream),
      owner: asString(payload.owner),
      state: payload.state === 'completed' ? 'completed' : 'active',
      descriptor: dimension && descriptorValue ? { dimension, value: descriptorValue } : null,
    };
  } catch {
    return null;
  }
}

async function readDispatchClaims(): Promise<{
  observed: boolean;
  claims: DispatchClaimSnapshot[];
  completed_tombstones: number;
  error?: string;
}> {
  let redis: RedisClientType | null = null;
  try {
    redis = await createRedis();
    await redis.connect();

    const keys: string[] = [];
    let cursor = '0';
    do {
      const raw = (await redis.sendCommand([
        'SCAN',
        cursor,
        'MATCH',
        `${CLAIM_PREFIX}:*`,
        'COUNT',
        '200',
      ])) as unknown;
      if (!Array.isArray(raw) || raw.length < 2) {
        throw new Error('dispatch claim scan returned malformed evidence');
      }
      cursor = String(raw[0]);
      const batch = Array.isArray(raw[1]) ? raw[1].map(String) : [];
      keys.push(...batch);
    } while (cursor !== '0' && keys.length < 1000);

    if (cursor !== '0' || keys.length > 1000) {
      throw new Error(
        'dispatch claim scan exceeded 1000 keys; refusing partial ownership evidence'
      );
    }

    const stringKeys = keys.filter((key) => key !== `${CLAIM_PREFIX}:repository:path-index`);

    if (stringKeys.length === 0) {
      return { observed: true, claims: [], completed_tombstones: 0 };
    }

    const values = await redis.mGet(stringKeys);
    const grouped = new Map<
      string,
      {
        task_id: string | null;
        workstream: string | null;
        owner: string | null;
        state: 'active' | 'completed';
        descriptors: ClaimDescriptor[];
      }
    >();

    for (const value of values) {
      if (!value) {
        throw new Error('dispatch claim value disappeared during observation');
      }
      const parsed = parseClaimValue(value);
      if (!parsed) {
        throw new Error('dispatch claim contained malformed evidence');
      }
      const current = grouped.get(parsed.claim_id) ?? {
        task_id: parsed.task_id,
        workstream: parsed.workstream,
        owner: parsed.owner,
        state: parsed.state,
        descriptors: [],
      };
      if (parsed.state === 'active') current.state = 'active';
      current.task_id = current.task_id || parsed.task_id;
      current.workstream = current.workstream || parsed.workstream;
      current.owner = current.owner || parsed.owner;
      if (
        parsed.descriptor &&
        !current.descriptors.some(
          (item) =>
            item.dimension === parsed.descriptor?.dimension &&
            item.value === parsed.descriptor?.value
        )
      ) {
        current.descriptors.push(parsed.descriptor);
      }
      grouped.set(parsed.claim_id, current);
    }

    const completedTombstones = [...grouped.values()].filter(
      (claim) => claim.state === 'completed'
    ).length;
    const claims = [...grouped.entries()]
      .filter(([, claim]) => claim.state === 'active')
      .map(([claimId, claim]) => ({
        claim_id: claimId,
        work_id: claim.task_id || claimId,
        workstream: claim.workstream,
        owner: claim.owner,
        state: 'active' as const,
        conflict_key:
          claim.descriptors.find((item) => item.dimension === 'conflict')?.value || null,
        semantic_scope:
          claim.descriptors.find((item) => item.dimension === 'semantic')?.value || null,
        affected_paths: claim.descriptors
          .filter((item) => item.dimension === 'path')
          .map((item) => item.value)
          .sort(),
      }))
      .sort((a, b) => a.work_id.localeCompare(b.work_id));

    return {
      observed: true,
      claims,
      completed_tombstones: completedTombstones,
    };
  } catch (error) {
    return {
      observed: false,
      claims: [],
      completed_tombstones: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (redis?.isOpen) {
      await redis.disconnect().catch(() => undefined);
    }
  }
}

export async function GET(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) return authError;

  const [claimSnapshot, githubSnapshot, runtimeSnapshot] = await Promise.all([
    readDispatchClaims(),
    readGithubWork(),
    readRuntimeSessions(),
  ]);

  return NextResponse.json({
    schema_version: 'MissionControlFactoryWorkstreamsV1',
    observed_at: new Date().toISOString(),
    claims_observed: claimSnapshot.observed,
    github_observed: githubSnapshot.observed,
    github_evidence_complete: githubSnapshot.complete,
    runtime_sessions_observed: runtimeSnapshot.observed,
    active_claims: claimSnapshot.claims,
    completed_claim_tombstones: claimSnapshot.completed_tombstones,
    pull_requests: githubSnapshot.items,
    runtime_sessions: runtimeSnapshot.sessions,
    errors: [
      ...(claimSnapshot.error ? [`claims: ${claimSnapshot.error}`] : []),
      ...(githubSnapshot.error ? [`github: ${githubSnapshot.error}`] : []),
      ...(runtimeSnapshot.error ? [`runtime_sessions: ${runtimeSnapshot.error}`] : []),
    ],
  });
}
