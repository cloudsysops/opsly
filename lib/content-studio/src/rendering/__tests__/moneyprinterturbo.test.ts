import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { MoneyPrinterTurboRenderClient, buildMoneyPrinterTurboPayload } from '../moneyprinterturbo.js';
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
  title: 'Shorts about Claude',
  story_hook: 'A short story hook',
  captions: [],
  image_prompt: 'A clean branded video intro',
  reel_script: [{ scene: 'Hook', copy: 'Start here', duration_sec: 3 }],
  call_to_action: 'Watch the full demo',
  compliance_flags: [],
  state: 'approved',
  created_at: new Date('2026-05-31T12:00:00.000Z').toISOString(),
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

describe('MoneyPrinterTurbo integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('builds a tenant-scoped payload for the render backend', () => {
    const payload = buildMoneyPrinterTurboPayload(request);

    expect(payload.tenant_slug).toBe('acme');
    expect(payload.request_id).toBe('req-123');
    expect(payload.draft_id).toBe('draft-001');
    expect(payload.preset.slug).toBe('youtube_shorts');
    expect(payload.draft.id).toBe('draft-001');
  });

  it('sends the render request and normalizes the returned manifest', async () => {
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
            submitted_at: '2026-05-31T12:00:00.000Z',
            completed_at: '2026-05-31T12:01:00.000Z',
            job_id: 'job-789',
            output_key: 'renders/acme/draft-001.mp4',
            asset: {
              url: 'https://cdn.example/render/acme/draft-001.mp4',
              thumbnail_url: 'https://cdn.example/render/acme/draft-001-thumb.jpg',
              subtitle_url: 'https://cdn.example/render/acme/draft-001.srt',
              duration_sec: 45,
              aspect_ratio: '9:16',
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    const client = new MoneyPrinterTurboRenderClient({
      base_url: 'https://moneyprinter.example',
      api_key: 'secret',
      render_path: '/render',
      timeout_ms: 1000,
    });

    const manifest = await client.render(request);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://moneyprinter.example/render');
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'content-type': 'application/json',
      'x-api-key': 'secret',
    });
    expect(manifest.status).toBe('completed');
    expect(manifest.asset?.url).toContain('draft-001.mp4');
    expect(manifest.preset_slug).toBe('youtube_shorts');
  });

  it('rejects drafts that are not approved or ready_to_copy', async () => {
    const client = new MoneyPrinterTurboRenderClient({ base_url: 'https://moneyprinter.example' });
    const invalid = {
      ...request,
      draft: { ...draft, state: 'draft' as const },
    };

    await expect(client.render(invalid)).rejects.toThrow(/not renderable/);
  });
});
