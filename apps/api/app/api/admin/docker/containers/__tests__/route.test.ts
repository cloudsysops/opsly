import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';

const ADMIN = 'docker-containers-test-admin-token';

vi.mock('../../../../../../lib/docker-ps-list', () => ({
  listDockerContainers: vi.fn(),
}));

import { listDockerContainers } from '../../../../../../lib/docker-ps-list';

describe('GET /api/admin/docker/containers', () => {
  const prev = process.env.PLATFORM_ADMIN_TOKEN;

  beforeEach(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
    vi.mocked(listDockerContainers).mockReset();
  });

  afterAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = prev;
  });

  it('returns 401 without token', async () => {
    const res = await GET(new Request('http://localhost/api/admin/docker/containers'));
    expect(res.status).toBe(401);
  });

  it('returns containers when docker ok', async () => {
    vi.mocked(listDockerContainers).mockResolvedValue({
      ok: true,
      truncated: false,
      containers: [
        {
          id: 'a1',
          names: ['c1'],
          image: 'alpine',
          command: 'sh',
          state: 'running',
          status: 'Up',
          ports: '',
          created_at: '',
          running_for: '',
        },
      ],
    });

    const res = await GET(
      new Request('http://localhost/api/admin/docker/containers', {
        headers: { Authorization: `Bearer ${ADMIN}` },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      docker_available: boolean;
      containers: unknown[];
    };
    expect(body.docker_available).toBe(true);
    expect(body.containers).toHaveLength(1);
  });

  it('returns docker_available false when docker fails', async () => {
    vi.mocked(listDockerContainers).mockResolvedValue({
      ok: false,
      error: 'Cannot connect to the Docker daemon',
    });

    const res = await GET(
      new Request('http://localhost/api/admin/docker/containers', {
        headers: { Authorization: `Bearer ${ADMIN}` },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      docker_available: boolean;
      error: string;
      containers: unknown[];
    };
    expect(body.docker_available).toBe(false);
    expect(body.error.length).toBeGreaterThan(0);
    expect(body.containers).toEqual([]);
  });
});
