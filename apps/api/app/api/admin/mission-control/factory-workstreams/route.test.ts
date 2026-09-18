import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  requireAdminAccess: vi.fn(),
}));

const runtimeMocks = vi.hoisted(() => ({
  proxyRuntimeOrchestrator: vi.fn(),
}));

const redisMocks = vi.hoisted(() => ({
  client: {
    isOpen: true,
    connect: vi.fn(async () => undefined),
    sendCommand: vi.fn(async () => ['0', []]),
    mGet: vi.fn(async () => []),
    disconnect: vi.fn(async () => undefined),
  },
  createClient: vi.fn(),
}));

vi.mock('../../../../../lib/auth', () => ({
  requireAdminAccess: authMocks.requireAdminAccess,
}));

vi.mock('../../../../../lib/runtime-proxy', () => ({
  proxyRuntimeOrchestrator: runtimeMocks.proxyRuntimeOrchestrator,
}));

vi.mock('redis', () => ({
  createClient: redisMocks.createClient,
}));

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function pull(number: number, overrides: Record<string, unknown> = {}) {
  return {
    number,
    title: `work ${number}`,
    body: `Task-Id: work-${number}\nDispatch-Claim: claim-${number}`,
    html_url: `https://github.com/cloudsysops/opsly/pull/${number}`,
    draft: false,
    head: {
      ref: `agent/opencode/work-${number}`,
      sha: `sha-${number}`,
    },
    ...overrides,
  };
}

function githubFetch(options?: {
  pulls?: Array<Record<string, unknown>>;
  mergeableState?: string;
  filename?: string;
  filesStatus?: number;
  changedFiles?: number;
}) {
  const pulls = options?.pulls ?? [pull(42)];
  const mergeableState = options?.mergeableState ?? 'clean';
  const filename = options?.filename ?? 'apps/admin/example.tsx';
  const filesStatus = options?.filesStatus ?? 200;
  const changedFiles = options?.changedFiles ?? 1;

  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input);

    if (url.includes('/pulls?state=open')) return json(pulls);

    const prMatch = url.match(/\/pulls\/(\d+)(?:\/files)?/);
    if (prMatch) {
      const number = Number(prMatch[1]);
      if (url.includes('/files?')) {
        if (filesStatus !== 200) return json({ error: 'files unavailable' }, filesStatus);
        return json([{ filename }]);
      }
      return json({
        ...pull(number),
        mergeable: true,
        mergeable_state: mergeableState,
        changed_files: changedFiles,
      });
    }

    if (url.includes('/status')) {
      return json({
        statuses: [
          {
            context: 'opsly-independent-review',
            state: 'success',
          },
        ],
      });
    }

    if (url.includes('/check-runs')) {
      return json({
        total_count: 1,
        check_runs: [
          {
            name: 'ci',
            status: 'completed',
            conclusion: 'success',
          },
        ],
      });
    }

    throw new Error(`unhandled GitHub URL: ${url}`);
  });
}

async function loadGet() {
  vi.resetModules();
  return (await import('./route')).GET;
}

describe('GET /api/admin/mission-control/factory-workstreams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();

    authMocks.requireAdminAccess.mockResolvedValue(null);
    runtimeMocks.proxyRuntimeOrchestrator.mockResolvedValue(json({ ok: true, sessions: [] }));

    redisMocks.client.isOpen = true;
    redisMocks.client.connect.mockResolvedValue(undefined);
    redisMocks.client.sendCommand.mockResolvedValue(['0', []]);
    redisMocks.client.mGet.mockResolvedValue([]);
    redisMocks.client.disconnect.mockResolvedValue(undefined);
    redisMocks.createClient.mockReturnValue(redisMocks.client);

    vi.stubEnv('REDIS_URL', 'redis://test');
    vi.stubEnv('GITHUB_TOKEN', 'test-token');
    vi.stubEnv('GITHUB_REPOSITORY', 'cloudsysops/opsly');
    vi.stubEnv('OPSLY_REPO_ROOT', path.resolve(process.cwd(), '../..'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns the auth denial before observing any factory source', async () => {
    authMocks.requireAdminAccess.mockResolvedValue(
      Response.json({ error: 'forbidden' }, { status: 403 })
    );
    const GET = await loadGet();

    const response = await GET(
      new Request('http://localhost/api/admin/mission-control/factory-workstreams')
    );

    expect(response.status).toBe(403);
    expect(redisMocks.createClient).not.toHaveBeenCalled();
  });

  it('degrades malformed runtime-session payloads without fabricating observation', async () => {
    vi.stubGlobal('fetch', githubFetch({ pulls: [] }));
    runtimeMocks.proxyRuntimeOrchestrator.mockResolvedValue(
      json({ ok: true, sessions: 'not-an-array' })
    );
    const GET = await loadGet();

    const response = await GET(
      new Request('http://localhost/api/admin/mission-control/factory-workstreams')
    );
    const body = (await response.json()) as {
      runtime_sessions_observed: boolean;
      runtime_sessions: unknown[];
      errors: string[];
    };

    expect(response.status).toBe(200);
    expect(body.runtime_sessions_observed).toBe(false);
    expect(body.runtime_sessions).toEqual([]);
    expect(body.errors.some((error) => error.startsWith('runtime_sessions:'))).toBe(true);
  });

  it('blocks merge readiness when a changed file is on a protected surface', async () => {
    vi.stubGlobal(
      'fetch',
      githubFetch({ filename: 'apps/orchestrator/src/index.ts', mergeableState: 'clean' })
    );
    const GET = await loadGet();

    const response = await GET(
      new Request('http://localhost/api/admin/mission-control/factory-workstreams')
    );
    const body = (await response.json()) as {
      pull_requests: Array<{
        protection_state: string;
        merge_readiness: string;
        blocker: string | null;
      }>;
    };

    expect(body.pull_requests[0]).toMatchObject({
      protection_state: 'PROTECTED',
      merge_readiness: 'BLOCKED',
    });
    expect(body.pull_requests[0]?.blocker).toMatch(/protected surface/i);
  });

  it('never reports READY when GitHub mergeable_state is blocked', async () => {
    vi.stubGlobal('fetch', githubFetch({ mergeableState: 'blocked' }));
    const GET = await loadGet();

    const response = await GET(
      new Request('http://localhost/api/admin/mission-control/factory-workstreams')
    );
    const body = (await response.json()) as {
      pull_requests: Array<{ merge_readiness: string; blocker: string | null }>;
    };

    expect(body.pull_requests[0]?.merge_readiness).toBe('BLOCKED');
    expect(body.pull_requests[0]?.blocker).toMatch(/GitHub reports.*blocked/i);
  });

  it('keeps protection and merge readiness UNKNOWN when file evidence cannot be fetched', async () => {
    vi.stubGlobal('fetch', githubFetch({ filesStatus: 503 }));
    const GET = await loadGet();

    const response = await GET(
      new Request('http://localhost/api/admin/mission-control/factory-workstreams')
    );
    const body = (await response.json()) as {
      pull_requests: Array<{
        protection_state: string;
        merge_readiness: string;
      }>;
    };

    expect(body.pull_requests[0]).toMatchObject({
      protection_state: 'UNKNOWN',
      merge_readiness: 'UNKNOWN',
    });
  });

  it('marks GitHub evidence partial when more canonical work PRs exist than the enrichment cap', async () => {
    const pulls = Array.from({ length: 21 }, (_, index) => pull(index + 1));
    vi.stubGlobal('fetch', githubFetch({ pulls }));
    const GET = await loadGet();

    const response = await GET(
      new Request('http://localhost/api/admin/mission-control/factory-workstreams')
    );
    const body = (await response.json()) as {
      github_observed: boolean;
      github_evidence_complete: boolean;
      pull_requests: unknown[];
    };

    expect(body.github_observed).toBe(true);
    expect(body.github_evidence_complete).toBe(false);
    expect(body.pull_requests).toHaveLength(20);
  });
});
