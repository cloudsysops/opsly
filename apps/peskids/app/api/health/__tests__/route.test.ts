import { describe, expect, it } from 'vitest';

describe('GET /api/health', () => {
  it('returns ok payload with version and service', async () => {
    const { GET } = await import('../route');
    const response = await GET();
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      timestamp: string;
      version: string;
      service: string;
    };
    expect(body.status).toBe('ok');
    expect(body.service).toBe('peskids');
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
