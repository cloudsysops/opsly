import { afterEach, describe, expect, it, vi } from 'vitest';

type HealthBody = {
  status: string;
  timestamp: string;
  version: string;
  service: string;
  environment: string;
  environment_boundary: { ok: boolean; violations?: string[] };
  git_sha: string | null;
  image_tag: string | null;
};

function stubHealthyDevEnvironment(): void {
  vi.stubEnv('PESKIDS_GIT_SHA', 'abc123def');
  vi.stubEnv('PESKIDS_IMAGE_TAG', 'ghcr.io/cloudsysops/peskids:abc123def');
  vi.stubEnv('PESKIDS_ENVIRONMENT', 'development');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321');
  vi.stubEnv('PESKIDS_ALLOW_UNPINNED_SUPABASE', 'true');
}

describe('GET /api/health', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns ok payload with version, service and environment', async () => {
    stubHealthyDevEnvironment();

    const { GET } = await import('../route');
    const response = await GET();
    expect(response.status).toBe(200);
    const body = (await response.json()) as HealthBody;
    expect(body.status).toBe('ok');
    expect(body.service).toBe('peskids');
    expect(body.environment).toBe('development');
    expect(body.environment_boundary).toEqual({ ok: true });
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.git_sha).toBe('abc123def');
    expect(body.image_tag).toBe('ghcr.io/cloudsysops/peskids:abc123def');
  });

  it('reports a 503 error with violation codes when staging points at the production DB', async () => {
    stubHealthyDevEnvironment();
    vi.stubEnv('PESKIDS_ENVIRONMENT', 'staging');
    // The known production ref, reached via https://<ref>.supabase.co.
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://jkwykpldnitavhmtuzmo.supabase.co');
    vi.stubEnv('PESKIDS_EXPECTED_SUPABASE_URL', 'https://jkwykpldnitavhmtuzmo.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-secret-value');

    const { GET } = await import('../route');
    const response = await GET();
    expect(response.status).toBe(503);
    const body = (await response.json()) as HealthBody;

    expect(body.status).toBe('error');
    expect(body.environment_boundary.ok).toBe(false);
    expect(body.environment_boundary.violations).toContain('staging_using_production_db');

    // The health endpoint is unauthenticated: it must never echo connection
    // strings, project refs or secrets.
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('service-role-secret-value');
    expect(serialized).not.toContain('supabase.co');
    expect(serialized).not.toContain('jkwykpldnitavhmtuzmo');
  });
});
