import { describe, expect, it } from 'vitest';

describe('GET /api/health', () => {
  it('returns ok payload with version and service', async () => {
    process.env.PESKIDS_GIT_SHA = 'abc123def';
    process.env.PESKIDS_IMAGE_TAG = 'ghcr.io/cloudsysops/peskids:abc123def';

    const { GET } = await import('../route');
    const response = await GET();
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      timestamp: string;
      version: string;
      service: string;
      git_sha: string | null;
      image_tag: string | null;
    };
    expect(body.status).toBe('ok');
    expect(body.service).toBe('peskids');
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.git_sha).toBe('abc123def');
    expect(body.image_tag).toBe('ghcr.io/cloudsysops/peskids:abc123def');
  });
});
