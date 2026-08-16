import { z } from 'zod';

export const CONTENT_ENGINE_SCHEMA_VERSION = 1 as const;

export const contentChannelValues = ['bitsitos', 'splashitos', 'opsly-universe'] as const;
export type ContentChannel = (typeof contentChannelValues)[number];

export const contentFormatValues = [
  'youtube_long',
  'youtube_short',
  'instagram_reel',
  'tiktok',
  'carousel',
  'image',
  'article',
] as const;
export type ContentFormat = (typeof contentFormatValues)[number];

export const contentGoalValues = [
  'awareness',
  'engagement',
  'lead_generation',
  'conversion',
  'education',
  'retention',
] as const;
export type ContentGoal = (typeof contentGoalValues)[number];

export const contentProjectStatusValues = [
  'idea',
  'drafting',
  'assets_pending',
  'ready_to_render',
  'rendering',
  'ready_for_review',
  'approved',
  'published',
  'failed',
  'archived',
] as const;
export type ContentProjectStatus = (typeof contentProjectStatusValues)[number];

export const contentVisualTypes = [
  'image',
  'title_card',
  'screen_capture',
  'abstract_motion',
  'character',
  'broll',
  'text_only',
] as const;
export type ContentVisualType = (typeof contentVisualTypes)[number];

export const contentMotionValues = ['static', 'zoom-in', 'zoom-out', 'pan-left', 'pan-right'] as const;
export type ContentMotion = (typeof contentMotionValues)[number];

export const contentAssetTypeValues = [
  'image',
  'video',
  'audio',
  'voice',
  'music',
  'subtitle',
  'thumbnail',
] as const;
export type ContentAssetType = (typeof contentAssetTypeValues)[number];

export const contentRenderStatusValues = [
  'queued',
  'rendering',
  'completed',
  'failed',
  'skipped',
] as const;
export type ContentRenderStatus = (typeof contentRenderStatusValues)[number];

export interface ContentChannelPreset {
  channel: ContentChannel;
  name: string;
  resolution: { width: number; height: number };
  aspectRatio: '9:16';
  fps: number;
  defaultDurationMs: number;
  font: string;
  subtitleStyle: {
    fontSize: number;
    primaryColor: string;
    outlineColor: string;
    outlineWidth: number;
    shadowColor: string;
    shadowOffset: number;
    alignment: number;
    marginV: number;
  };
  safeArea: { top: number; right: number; bottom: number; left: number };
  transitionStyle: 'fast-cut' | 'soft-cut' | 'cinematic';
  musicLevel: number;
  voiceLevel: number;
  brandColors: string[];
  logo: string | null;
  intro: string;
  outro: string;
  ctaStyle: string;
  sceneDurationLimits: { minMs: number; maxMs: number };
  motionDefaults: ContentMotion[];
  tone: string;
}

export interface ContentProject {
  id: string;
  tenantId: string;
  channel: ContentChannel;
  series: string;
  episode: string;
  title: string;
  slug: string;
  goal: ContentGoal;
  audience: string;
  format: ContentFormat;
  status: ContentProjectStatus;
  preset: ContentChannel;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  reviewNotes?: string;
  publishedAt?: string;
  publicationUrl?: string;
}

export interface ContentScene {
  id: string;
  projectId: string;
  order: number;
  durationMs: number;
  visualType: ContentVisualType;
  assetRefs: string[];
  voiceover?: string;
  caption: string;
  transition: 'cut' | 'fade' | 'dissolve' | 'wipe' | 'zoom';
  motion: ContentMotion;
  narration?: string;
}

export interface ContentAsset {
  id: string;
  tenantId: string;
  projectId: string;
  type: ContentAssetType;
  path: string;
  source: string;
  license: string;
  checksum: string;
  metadata: Record<string, unknown>;
}

export interface ContentRenderJob {
  id: string;
  projectId: string;
  status: ContentRenderStatus;
  startedAt?: string;
  completedAt?: string;
  outputPath?: string;
  logs: string[];
  error?: string;
}

export interface ContentApproval {
  state: 'ready_for_review' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  reviewNotes?: string;
}

export interface ContentMetadataExport {
  title: string;
  description: string;
  tags: string[];
  privacyStatus: 'private' | 'unlisted';
}

export interface ContentProjectEnvelope {
  schemaVersion: typeof CONTENT_ENGINE_SCHEMA_VERSION;
  project: ContentProject;
  scenes: ContentScene[];
  assets: ContentAsset[];
  renderJobs: ContentRenderJob[];
  approval?: ContentApproval;
  metadata?: ContentMetadataExport;
}

export interface ContentProjectCreateInput {
  tenantId: string;
  channel: ContentChannel;
  series: string;
  episode?: string;
  title: string;
  goal: ContentGoal;
  audience: string;
  format: ContentFormat;
  preset?: ContentChannel;
}

const ISODateTime = z.string().datetime();

export const ContentSceneSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  order: z.number().int().nonnegative(),
  durationMs: z.number().int().positive(),
  visualType: z.enum(contentVisualTypes),
  assetRefs: z.array(z.string().min(1)),
  voiceover: z.string().optional(),
  caption: z.string().min(1),
  transition: z.enum(['cut', 'fade', 'dissolve', 'wipe', 'zoom']),
  motion: z.enum(contentMotionValues),
  narration: z.string().optional(),
});

export const ContentAssetSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  projectId: z.string().min(1),
  type: z.enum(contentAssetTypeValues),
  path: z.string().min(1),
  source: z.string().min(1),
  license: z.string().min(1),
  checksum: z.string().min(1),
  metadata: z.record(z.unknown()),
});

export const ContentRenderJobSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  status: z.enum(contentRenderStatusValues),
  startedAt: ISODateTime.optional(),
  completedAt: ISODateTime.optional(),
  outputPath: z.string().min(1).optional(),
  logs: z.array(z.string()),
  error: z.string().optional(),
});

export const ContentProjectSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  channel: z.enum(contentChannelValues),
  series: z.string().min(1),
  episode: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  goal: z.enum(contentGoalValues),
  audience: z.string().min(1),
  format: z.enum(contentFormatValues),
  status: z.enum(contentProjectStatusValues),
  preset: z.enum(contentChannelValues),
  createdAt: ISODateTime,
  updatedAt: ISODateTime,
  approvedBy: z.string().optional(),
  approvedAt: ISODateTime.optional(),
  reviewNotes: z.string().optional(),
  publishedAt: ISODateTime.optional(),
  publicationUrl: z.string().url().optional(),
});

export const ContentApprovalSchema = z.object({
  state: z.enum(['ready_for_review', 'approved', 'rejected']),
  approvedBy: z.string().optional(),
  approvedAt: ISODateTime.optional(),
  reviewNotes: z.string().optional(),
});

export const ContentMetadataSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string().min(1)),
  privacyStatus: z.enum(['private', 'unlisted']),
});

export const ContentProjectEnvelopeSchema = z.object({
  schemaVersion: z.literal(CONTENT_ENGINE_SCHEMA_VERSION),
  project: ContentProjectSchema,
  scenes: z.array(ContentSceneSchema),
  assets: z.array(ContentAssetSchema),
  renderJobs: z.array(ContentRenderJobSchema),
  approval: ContentApprovalSchema.optional(),
  metadata: ContentMetadataSchema.optional(),
});

export const ContentProjectCreateInputSchema = z.object({
  tenantId: z.string().min(1),
  channel: z.enum(contentChannelValues),
  series: z.string().min(1),
  episode: z.string().min(1).optional(),
  title: z.string().min(1),
  goal: z.enum(contentGoalValues),
  audience: z.string().min(1),
  format: z.enum(contentFormatValues),
  preset: z.enum(contentChannelValues).optional(),
});

export type ContentProjectEnvelopeInput = z.infer<typeof ContentProjectEnvelopeSchema>;
