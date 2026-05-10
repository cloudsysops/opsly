import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  graphErrorMessage,
  isMetaPageFeedConfigured,
  publishMetaPageFeedPost,
  resolveMetaGraphApiVersion,
} from '../meta-page-feed';

describe('meta-page-feed', () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
    delete process.env.META_PAGE_ID;
    delete process.env.META_PAGE_ACCESS_TOKEN;
    delete process.env.META_GRAPH_API_VERSION;
  });

  afterEach(() => {
    process.env = origEnv;
    vi.unstubAllGlobals();
  });

  it('resolveMetaGraphApiVersion defaults to v21.0', () => {
    expect(resolveMetaGraphApiVersion()).toBe('v21.0');
  });

  it('resolveMetaGraphApiVersion reads META_GRAPH_API_VERSION', () => {
    process.env.META_GRAPH_API_VERSION = 'v20.0';
    expect(resolveMetaGraphApiVersion()).toBe('v20.0');
  });

  it('isMetaPageFeedConfigured is false without vars', () => {
    expect(isMetaPageFeedConfigured()).toBe(false);
  });

  it('isMetaPageFeedConfigured is true when both set', () => {
    process.env.META_PAGE_ID = '123';
    process.env.META_PAGE_ACCESS_TOKEN = 'tok';
    expect(isMetaPageFeedConfigured()).toBe(true);
  });

  it('graphErrorMessage reads error.message', () => {
    expect(graphErrorMessage({ error: { message: 'Invalid OAuth' } })).toBe('Invalid OAuth');
  });

  it('publishMetaPageFeedPost dry run skips network', async () => {
    const res = await publishMetaPageFeedPost({ message: 'hello', dryRun: true });
    expect(res).toEqual({ ok: true, post_id: '', dry_run: true });
  });

  it('publishMetaPageFeedPost returns 503 when not configured', async () => {
    const res = await publishMetaPageFeedPost({ message: 'hello', dryRun: false });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(503);
    }
  });

  it('publishMetaPageFeedPost maps Graph success', async () => {
    process.env.META_PAGE_ID = 'page1';
    process.env.META_PAGE_ACCESS_TOKEN = 'secret';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'post_123' }),
      })
    );

    const res = await publishMetaPageFeedPost({ message: 'hello', dryRun: false });
    expect(res).toEqual({ ok: true, post_id: 'post_123', dry_run: false });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('publishMetaPageFeedPost maps Graph error body', async () => {
    process.env.META_PAGE_ID = 'page1';
    process.env.META_PAGE_ACCESS_TOKEN = 'secret';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid parameter' } }),
      })
    );

    const res = await publishMetaPageFeedPost({ message: 'hello', dryRun: false });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(400);
      expect(res.error).toBe('Invalid parameter');
    }
  });
});
