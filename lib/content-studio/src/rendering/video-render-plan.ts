import type { ContentDraft, TenantContentPreset, VideoRenderRequest } from '../types.js';

/**
 * Dry-run render plan for a video render request. Does NOT call any render
 * provider, does NOT publish, does NOT incur cost — it only describes what
 * a future execution would need, so a human (or an automated worker once
 * wired) can review before anything runs.
 */
export interface VideoRenderPlan {
  tenant_slug: string;
  request_id: string;
  draft_id: string;
  preset_slug: string;
  status: 'ready' | 'blocked';
  blocking_reasons: string[];
  estimated_duration_sec: number;
  asset_requirements: {
    aspect_ratio: string;
    target_duration_sec: number;
  };
  output_targets: string[];
  suggested_pipeline: string[];
  notes: string[];
}

/**
 * Build a dry-run render plan for a video render request.
 * Validates the request structure and draft state without calling any external APIs.
 */
export function buildVideoRenderPlan(request: VideoRenderRequest): VideoRenderPlan {
  const blockingReasons: string[] = [];

  // Validate request structure
  if (!request.tenant_slug?.trim()) {
    blockingReasons.push('tenant_slug is required');
  }
  if (!request.request_id?.trim()) {
    blockingReasons.push('request_id is required');
  }
  if (!request.draft_id?.trim()) {
    blockingReasons.push('draft_id is required');
  }

  // Validate draft state
  const renderableStates = new Set(['approved', 'ready_to_copy']);
  if (!renderableStates.has(request.draft.state)) {
    blockingReasons.push(
      `Draft state "${request.draft.state}" is not renderable. Expected approved or ready_to_copy.`
    );
  }

  // Validate draft tenant match
  if (request.draft.tenant_slug !== request.tenant_slug) {
    blockingReasons.push(
      `Draft tenant_slug "${request.draft.tenant_slug}" does not match request tenant_slug "${request.tenant_slug}"`
    );
  }

  // Validate draft ID match
  if (request.draft.id !== request.draft_id) {
    blockingReasons.push(
      `Draft id "${request.draft.id}" does not match request draft_id "${request.draft_id}"`
    );
  }

  // Validate preset
  if (!request.preset?.slug) {
    blockingReasons.push('preset.slug is required');
  }

  // Calculate estimated duration from script
  let estimatedDuration = request.preset.target_duration_sec;
  if (Array.isArray(request.draft.reel_script) && request.draft.reel_script.length > 0) {
    estimatedDuration = request.draft.reel_script.reduce(
      (sum, scene) => sum + (scene?.duration_sec ?? 0),
      0
    );
  }

  return {
    tenant_slug: request.tenant_slug,
    request_id: request.request_id,
    draft_id: request.draft_id,
    preset_slug: request.preset.slug,
    status: blockingReasons.length === 0 ? 'ready' : 'blocked',
    blocking_reasons: blockingReasons,
    estimated_duration_sec: estimatedDuration,
    asset_requirements: {
      aspect_ratio: request.preset.aspect_ratio,
      target_duration_sec: request.preset.target_duration_sec,
    },
    output_targets: [
      `renders/${request.tenant_slug}/${request.draft_id}/${request.request_id}`,
    ],
    suggested_pipeline: [
      'voiceover (text-to-speech, es+en per preset)',
      'visual composition (MoneyPrinterTurbo)',
      'thumbnail generation (FFmpeg)',
      'subtitles (optional, per preset)',
      'human review (optional, per preset)',
    ],
    notes: [
      'No render provider is called by this plan — output is informational only.',
      'Ready to submit when status is "ready" and all blocking_reasons are resolved.',
      `Estimated output duration: ${estimatedDuration}s based on draft reel_script`,
    ],
  };
}

/**
 * Validate a render plan's blocking reasons. Throws if plan is not ready.
 */
export function validateRenderPlanReady(plan: VideoRenderPlan): void {
  if (plan.status !== 'ready') {
    throw new Error(
      `Render plan for ${plan.draft_id} is not ready. Blocking reasons: ${plan.blocking_reasons.join('; ')}`
    );
  }
}
