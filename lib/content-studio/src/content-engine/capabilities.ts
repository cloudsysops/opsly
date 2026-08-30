export const CONTENT_OS_CAPABILITIES = [
  'trend_scout',
  'research',
  'fact_check',
  'script_writer',
  'storyboard',
  'transformative_angle',
  'clip_discovery',
  'caption_writer',
  'thumbnail_ideation',
  'media_render',
  'content_qa',
  'rights_review',
  'analytics',
] as const;

export type ContentOsCapability = (typeof CONTENT_OS_CAPABILITIES)[number];

export function contentOsCapabilityMap(): Record<ContentOsCapability, string> {
  return {
    trend_scout: 'content-engine/trends.ts',
    research: 'content-engine/pipeline.ts',
    fact_check: 'content-engine/angles.ts',
    script_writer: 'content-engine/pipeline.ts',
    storyboard: 'content-engine/pipeline.ts',
    transformative_angle: 'content-engine/angles.ts',
    clip_discovery: 'content-engine/clip-discovery.ts',
    caption_writer: 'content-engine/ffmpeg.ts',
    thumbnail_ideation: 'content-engine/ffmpeg.ts',
    media_render: 'content-engine/ffmpeg.ts',
    content_qa: 'content-engine/validation.ts',
    rights_review: 'content-engine/rights.ts',
    analytics: 'not-wired-no-metrics-source',
  };
}
