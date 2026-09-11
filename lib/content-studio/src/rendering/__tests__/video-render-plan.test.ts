import { describe, it, expect } from 'vitest';
import { buildVideoRenderPlan, validateRenderPlanReady } from '../video-render-plan.js';
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
  reel_script: [
    { scene: 'Hook', copy: 'Start here', duration_sec: 5 },
    { scene: 'Body', copy: 'Main content', duration_sec: 35 },
    { scene: 'CTA', copy: 'Call to action', duration_sec: 5 },
  ],
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

describe('buildVideoRenderPlan', () => {
  it('creates a ready plan for a valid request', () => {
    const plan = buildVideoRenderPlan(request);

    expect(plan.status).toBe('ready');
    expect(plan.blocking_reasons).toHaveLength(0);
    expect(plan.tenant_slug).toBe('acme');
    expect(plan.request_id).toBe('req-123');
    expect(plan.draft_id).toBe('draft-001');
    expect(plan.preset_slug).toBe('youtube_shorts');
  });

  it('calculates estimated duration from reel_script', () => {
    const plan = buildVideoRenderPlan(request);

    // 5 + 35 + 5 = 45 seconds from script
    expect(plan.estimated_duration_sec).toBe(45);
  });

  it('includes asset requirements from preset', () => {
    const plan = buildVideoRenderPlan(request);

    expect(plan.asset_requirements).toMatchObject({
      aspect_ratio: '9:16',
      target_duration_sec: 45,
    });
  });

  it('blocks plan if tenant_slug is missing', () => {
    const invalid = { ...request, tenant_slug: '' };
    const plan = buildVideoRenderPlan(invalid);

    expect(plan.status).toBe('blocked');
    expect(plan.blocking_reasons).toContain('tenant_slug is required');
  });

  it('blocks plan if draft state is not approved or ready_to_copy', () => {
    const invalid = {
      ...request,
      draft: { ...draft, state: 'draft' as const },
    };
    const plan = buildVideoRenderPlan(invalid);

    expect(plan.status).toBe('blocked');
    expect(plan.blocking_reasons.some((r) => r.includes('not renderable'))).toBe(true);
  });

  it('blocks plan if tenant_slug does not match draft.tenant_slug', () => {
    const invalid = {
      ...request,
      tenant_slug: 'different',
      draft: { ...draft, tenant_slug: 'acme' },
    };
    const plan = buildVideoRenderPlan(invalid);

    expect(plan.status).toBe('blocked');
    expect(plan.blocking_reasons.some((r) => r.includes('does not match'))).toBe(true);
  });

  it('blocks plan if draft_id does not match draft.id', () => {
    const invalid = {
      ...request,
      draft_id: 'different',
      draft: { ...draft, id: 'draft-001' },
    };
    const plan = buildVideoRenderPlan(invalid);

    expect(plan.status).toBe('blocked');
    expect(plan.blocking_reasons.some((r) => r.includes('does not match'))).toBe(true);
  });

  it('uses preset target_duration_sec when reel_script is empty', () => {
    const noScript = {
      ...request,
      draft: { ...draft, reel_script: undefined },
    };
    const plan = buildVideoRenderPlan(noScript);

    expect(plan.estimated_duration_sec).toBe(45);
  });
});

describe('validateRenderPlanReady', () => {
  it('throws when plan is not ready', () => {
    const invalidRequest = {
      ...request,
      draft: { ...draft, state: 'draft' as const },
    };
    const plan = buildVideoRenderPlan(invalidRequest);

    expect(() => validateRenderPlanReady(plan)).toThrow(/not ready/);
    expect(() => validateRenderPlanReady(plan)).toThrow(/Blocking reasons/);
  });

  it('does not throw when plan is ready', () => {
    const plan = buildVideoRenderPlan(request);

    expect(() => validateRenderPlanReady(plan)).not.toThrow();
  });
});
