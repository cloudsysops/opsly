import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RenderQueueManager,
  InMemoryRenderQueueStorage,
  type RenderQueueEntry,
} from '../render-queue-manager.js';
import { MoneyPrinterTurboRenderClient } from '../moneyprinterturbo.js';
import type { ContentDraft, TenantContentPreset, VideoRenderRequest } from '../../types.js';

const preset: TenantContentPreset = {
  slug: 'youtube_shorts',
  label: 'YouTube Shorts',
  platforms: ['youtube_shorts'],
  pillars: ['prompts', 'claude', 'marketing'],
  tone_of_voice: 'friendly',
  language: 'es',
  visual_style: 'fast-paced vertical video',
  aspect_ratio: '9:16',
  target_duration_sec: 45,
  approval_required: true,
  render_provider: 'moneyprinterturbo',
};

const draft: ContentDraft = {
  id: 'draft-001',
  tenant_slug: 'acme',
  event_id: 'evt-001',
  title: 'Test Video',
  story_hook: 'A compelling story',
  captions: [],
  image_prompt: 'A clean video intro',
  reel_script: [{ scene: 'Hook', copy: 'Start here', duration_sec: 45 }],
  call_to_action: 'Watch the demo',
  compliance_flags: [],
  state: 'approved',
  created_at: new Date().toISOString(),
  copy_paste_kit: {
    instagram_caption: '',
    facebook_caption: '',
    linkedin_caption: '',
    x_caption: '',
    tiktok_script: '',
    youtube_shorts_script: '',
  },
};

const request: VideoRenderRequest = {
  tenant_slug: 'acme',
  request_id: 'req-123',
  draft_id: 'draft-001',
  preset,
  draft,
};

describe('RenderQueueManager', () => {
  let client: MoneyPrinterTurboRenderClient;
  let manager: RenderQueueManager;
  let storage: InMemoryRenderQueueStorage;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    storage = new InMemoryRenderQueueStorage();
    client = new MoneyPrinterTurboRenderClient({
      base_url: 'https://api.example.com',
      api_key: 'test-key',
    });
    manager = new RenderQueueManager({
      mpt_client: client,
      storage,
      max_retries: 3,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('enqueue', () => {
    it('creates a pending queue entry for a valid request', async () => {
      const entry = await manager.enqueue(request);

      expect(entry.request_id).toBe('req-123');
      expect(entry.draft_id).toBe('draft-001');
      expect(entry.tenant_slug).toBe('acme');
      expect(entry.status).toBe('pending');
      expect(entry.retry_count).toBe(0);
      expect(entry.max_retries).toBe(3);
    });

    it('throws when draft is not in approved state', async () => {
      const invalid = {
        ...request,
        draft: { ...draft, state: 'draft' as const },
      };

      await expect(manager.enqueue(invalid)).rejects.toThrow(/blocked/);
    });

    it('includes dry-run plan in metadata', async () => {
      const entry = await manager.enqueue(request);

      expect(entry.metadata.plan).toBeDefined();
      expect(entry.metadata.plan.status).toBe('ready');
    });
  });

  describe('submit', () => {
    it('submits a pending entry and stores manifest on success', async () => {
      const fetchMock = vi.mocked(fetch);
      const manifest = {
        provider: 'moneyprinterturbo' as const,
        status: 'completed' as const,
        tenant_slug: 'acme',
        request_id: 'req-123',
        draft_id: 'draft-001',
        preset_slug: 'youtube_shorts',
        submitted_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        job_id: 'job-123',
        output_key: 'renders/acme/draft-001.mp4',
        asset: {
          url: 'https://cdn.example/render.mp4',
          thumbnail_url: 'https://cdn.example/thumb.jpg',
          duration_sec: 45,
          aspect_ratio: '9:16' as const,
        },
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ manifest }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      await manager.enqueue(request);
      const result = await manager.submit(request);

      expect(result.status).toBe('completed');
      expect(result.manifest).toEqual(manifest);
      expect(result.submitted_at).toBeDefined();
    });

    it('increments retry_count on failure', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      await manager.enqueue(request);
      const result = await manager.submit(request);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Network error');
      expect(result.retry_count).toBe(1);
    });

    it('throws when no queue entry exists', async () => {
      const noEntryRequest = { ...request, request_id: 'nonexistent' };

      await expect(manager.submit(noEntryRequest)).rejects.toThrow(/not found/);
    });

    it('throws when trying to resubmit a completed entry', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            manifest: {
              provider: 'moneyprinterturbo',
              status: 'completed',
              tenant_slug: 'acme',
              request_id: 'req-123',
              draft_id: 'draft-001',
              preset_slug: 'youtube_shorts',
              submitted_at: new Date().toISOString(),
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      );

      await manager.enqueue(request);
      await manager.submit(request);

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ manifest: {} }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      await expect(manager.submit(request)).rejects.toThrow(/status/);
    });
  });

  describe('getStatus', () => {
    it('retrieves queue entry status', async () => {
      await manager.enqueue(request);
      const entry = await manager.getStatus('req-123');

      expect(entry).toBeDefined();
      expect(entry?.request_id).toBe('req-123');
      expect(entry?.status).toBe('pending');
    });

    it('returns null for nonexistent entry', async () => {
      const entry = await manager.getStatus('nonexistent');

      expect(entry).toBeNull();
    });
  });

  describe('listPending', () => {
    it('returns pending and failed entries for a tenant', async () => {
      await manager.enqueue(request);

      const fetchMock = vi.mocked(fetch);
      fetchMock.mockRejectedValueOnce(new Error('API error'));

      try {
        await manager.submit(request);
      } catch {
        // Error expected
      }

      const list = await manager.listPending('acme');

      expect(list.length).toBeGreaterThan(0);
      expect(list.some((e) => e.status === 'pending' || e.status === 'failed')).toBe(true);
    });
  });

  describe('cancel', () => {
    it('cancels a pending entry', async () => {
      await manager.enqueue(request);
      await manager.cancel('req-123');

      const entry = await manager.getStatus('req-123');

      expect(entry?.status).toBe('cancelled');
      expect(entry?.completed_at).toBeDefined();
    });

    it('throws when trying to cancel a submitted entry', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ manifest: {} }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      await manager.enqueue(request);
      await manager.submit(request);

      await expect(manager.cancel('req-123')).rejects.toThrow(/Cannot cancel/);
    });
  });

  describe('purgeCompleted', () => {
    it('removes completed entries older than age', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            manifest: {
              provider: 'moneyprinterturbo',
              status: 'completed',
              tenant_slug: 'acme',
              request_id: 'req-123',
              draft_id: 'draft-001',
              preset_slug: 'youtube_shorts',
              submitted_at: new Date().toISOString(),
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      );

      await manager.enqueue(request);
      await manager.submit(request);

      // Manually set completed_at to past
      const oldDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await storage.update('req-123', { completed_at: oldDate });

      const purged = await manager.purgeCompleted('acme', 60 * 1000); // 1 minute ago

      expect(purged).toBe(1);

      const entry = await manager.getStatus('req-123');
      expect(entry).toBeNull();
    });
  });
});

describe('InMemoryRenderQueueStorage', () => {
  let storage: InMemoryRenderQueueStorage;

  beforeEach(() => {
    storage = new InMemoryRenderQueueStorage();
  });

  const createEntry = (id: string, status: RenderQueueEntry['status'] = 'pending') =>
    ({
      request_id: id,
      draft_id: `draft-${id}`,
      tenant_slug: 'test',
      preset_slug: 'test_preset',
      status,
      retry_count: 0,
      max_retries: 3,
      metadata: {},
    } as RenderQueueEntry);

  it('saves and loads entries', async () => {
    const entry = createEntry('req-1');
    await storage.save(entry);

    const loaded = await storage.load('req-1');

    expect(loaded).toEqual(entry);
  });

  it('lists entries by tenant and status', async () => {
    await storage.save(createEntry('req-1', 'pending'));
    await storage.save(createEntry('req-2', 'completed'));
    await storage.save(createEntry('req-3', 'pending'));

    const pending = await storage.list('test', 'pending');
    const completed = await storage.list('test', 'completed');

    expect(pending).toHaveLength(2);
    expect(completed).toHaveLength(1);
  });

  it('updates entries', async () => {
    const entry = createEntry('req-1');
    await storage.save(entry);

    await storage.update('req-1', { status: 'processing' });

    const updated = await storage.load('req-1');
    expect(updated?.status).toBe('processing');
  });

  it('deletes entries', async () => {
    const entry = createEntry('req-1');
    await storage.save(entry);

    await storage.delete('req-1');

    const deleted = await storage.load('req-1');
    expect(deleted).toBeNull();
  });

  it('throws when updating nonexistent entry', async () => {
    await expect(storage.update('nonexistent', { status: 'processing' })).rejects.toThrow(
      /not found/
    );
  });
});
