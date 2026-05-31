import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRender = vi.fn();
vi.mock('@intcloudsysops/content-studio', () => ({
  MoneyPrinterTurboRenderClient: vi.fn(() => ({
    render: mockRender,
  })),
  buildMoneyPrinterTurboPayload: vi.fn((r) => ({
    tenant_slug: r.tenant_slug,
    request_id: r.request_id,
    draft_id: r.draft_id,
    preset: r.preset,
    draft: r.draft,
  })),
}));

vi.mock('../observability/worker-log.ts', () => ({
  logWorkerLifecycle: vi.fn(),
  logWorkerInfo: vi.fn(),
  logWorkerError: vi.fn(),
}));

import { processContentVideo, CONTENT_VIDEO_QUEUE } from '../workers/ContentVideoWorker.js';

const validDraft = {
  id: 'draft-001',
  tenant_slug: 'test-tenant',
  event_id: 'event-001',
  title: 'Test deployment success story',
  story_hook: 'Deployed new version 30 minutes ago. Changes live now.',
  captions: [
    {
      platform: 'instagram',
      text: 'New deploy!',
      hashtags: ['#devops', '#ship'],
      characterCount: 20,
    },
  ],
  image_prompt: 'A dashboard showing green checkmarks',
  call_to_action: 'See what changed \u2192',
  compliance_flags: [],
  state: 'approved' as const,
  created_at: new Date().toISOString(),
  approved_at: new Date().toISOString(),
  approved_by: 'admin',
  copy_paste_kit: {
    instagram_caption: 'New deploy!',
    facebook_caption: 'New deploy!',
    linkedin_caption: 'New deploy!',
    x_caption: 'New deploy!',
    tiktok_script: 'Check out our new deploy',
    youtube_shorts_script: 'New deploy is live',
  },
};

const validPreset = {
  slug: 'youtube-shorts-tech',
  label: 'YouTube Shorts \u2014 Tech',
  platforms: ['youtube_shorts'] as const,
  pillars: ['prompts'] as const,
  tone_of_voice: 'technical' as const,
  language: 'es' as const,
  visual_style: 'minimal',
  aspect_ratio: '9:16' as const,
  target_duration_sec: 30,
  approval_required: true,
  render_provider: 'moneyprinterturbo' as const,
};

function mockJob(data: Record<string, unknown>) {
  return {
    id: 'job-test',
    data,
    timestamp: Date.now(),
    name: 'content_video',
  } as any;
}

describe('ContentVideoWorker', () => {
  beforeEach(() => {
    mockRender.mockReset();
  });

  it('exports correct queue name', () => {
    expect(CONTENT_VIDEO_QUEUE).toBe('content-video');
  });

  it('renders a video via MoneyPrinterTurboRenderClient', async () => {
    const manifest = {
      provider: 'moneyprinterturbo',
      status: 'queued',
      tenant_slug: 'test-tenant',
      request_id: 'req-001',
      draft_id: 'draft-001',
      preset_slug: 'youtube-shorts-tech',
      submitted_at: new Date().toISOString(),
    };
    mockRender.mockResolvedValueOnce(manifest);

    const result = await processContentVideo(
      mockJob({
        tenant_slug: 'test-tenant',
        request_id: 'req-001',
        draft_id: 'draft-001',
        draft: validDraft,
        preset: validPreset,
      }),
    );

    expect(mockRender).toHaveBeenCalledWith({
      tenant_slug: 'test-tenant',
      request_id: 'req-001',
      draft_id: 'draft-001',
      preset: validPreset,
      draft: validDraft,
    });
    expect(result).toEqual(manifest);
  });

  it('throws when MPT returns error', async () => {
    mockRender.mockRejectedValueOnce(new Error('MPT API error: 500'));

    await expect(
      processContentVideo(
        mockJob({
          tenant_slug: 'test-tenant',
          request_id: 'req-002',
          draft_id: 'draft-002',
          draft: validDraft,
          preset: validPreset,
        }),
      ),
    ).rejects.toThrow('MPT API error: 500');
  });

  it('uses custom mpt_base_url from payload', async () => {
    mockRender.mockResolvedValueOnce({ status: 'completed', provider: 'moneyprinterturbo' });

    await processContentVideo(
      mockJob({
        tenant_slug: 'test-tenant',
        request_id: 'req-003',
        draft_id: 'draft-003',
        draft: validDraft,
        preset: validPreset,
        mpt_base_url: 'http://custom-mpt:8080',
        mpt_api_key: 'sec-123',
      }),
    );

    const { MoneyPrinterTurboRenderClient } = await import('@intcloudsysops/content-studio');
    expect(MoneyPrinterTurboRenderClient).toHaveBeenCalledWith(
      expect.objectContaining({
        base_url: 'http://custom-mpt:8080',
        api_key: 'sec-123',
      }),
    );
  });
});
