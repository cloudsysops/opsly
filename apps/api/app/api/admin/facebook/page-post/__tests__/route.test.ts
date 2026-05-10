import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../route';

vi.mock('../../../../../../lib/meta-page-feed', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../../lib/meta-page-feed')>();
  return {
    ...actual,
    publishMetaPageFeedPost: vi.fn(),
  };
});

import {
  isMetaPageFeedConfigured,
  publishMetaPageFeedPost,
} from '../../../../../../lib/meta-page-feed';

describe('/api/admin/facebook/page-post', () => {
  const origToken = process.env.PLATFORM_ADMIN_TOKEN;

  beforeEach(() => {
    process.env.PLATFORM_ADMIN_TOKEN = 'test-admin-token';
    vi.clearAllMocks();
    vi.mocked(publishMetaPageFeedPost).mockResolvedValue({
      ok: true,
      post_id: 'post_xyz',
      dry_run: false,
    });
  });

  afterEach(() => {
    process.env.PLATFORM_ADMIN_TOKEN = origToken;
    delete process.env.META_PAGE_ID;
    delete process.env.META_PAGE_ACCESS_TOKEN;
  });

  it('GET returns 401 without admin token', async () => {
    const res = await GET(new Request('http://localhost/api/admin/facebook/page-post'));
    expect(res.status).toBe(401);
  });

  it('GET returns configured flag', async () => {
    process.env.META_PAGE_ID = '1';
    process.env.META_PAGE_ACCESS_TOKEN = 't';
    const res = await GET(
      new Request('http://localhost/api/admin/facebook/page-post', {
        headers: { Authorization: 'Bearer test-admin-token' },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { configured: boolean };
    expect(body.configured).toBe(true);
  });

  it('POST returns 400 for empty message', async () => {
    const res = await POST(
      new Request('http://localhost/api/admin/facebook/page-post', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-admin-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: '   ' }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('POST dry_run succeeds without Meta env', async () => {
    vi.mocked(publishMetaPageFeedPost).mockResolvedValue({
      ok: true,
      post_id: '',
      dry_run: true,
    });
    const res = await POST(
      new Request('http://localhost/api/admin/facebook/page-post', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-admin-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'Hola', dry_run: true }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; dry_run: boolean };
    expect(body.ok).toBe(true);
    expect(body.dry_run).toBe(true);
  });

  it('POST returns 503 when not configured and not dry_run', async () => {
    expect(isMetaPageFeedConfigured()).toBe(false);
    const res = await POST(
      new Request('http://localhost/api/admin/facebook/page-post', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-admin-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'Real post' }),
      })
    );
    expect(res.status).toBe(503);
  });
});
