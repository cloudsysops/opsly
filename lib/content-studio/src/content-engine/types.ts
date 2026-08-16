import { z } from 'zod';

export const CONTENT_ENGINE_SCHEMA_VERSION = 2 as const;

export const contentChannelValues = [
  'bitsitos',
  'splashitos',
  'opsly-universe',
  'peskids',
] as const;
export type ContentChannel = (typeof contentChannelValues)[number];

export const contentModeValues = ['original', 'repurpose', 'commentary'] as const;
export type ContentMode = (typeof contentModeValues)[number];

export const contentPortalValues = [
  'MIND',
  'FUTURE',
  'WILD',
  'HUMAN',
  'EARTH',
  'MOVE',
  'LAB',
  'ORIGINS',
  'UNKNOWN',
] as const;
export type ContentPortal = (typeof contentPortalValues)[number];

export const contentFormatTemplateValues = [
  'NOVA_REACTS',
  'NOVA_EXPLAINS',
  'REALITY_CHECK',
  'INTO_THE_PORTAL',
  'HUMAN_STORY',
  'WILD_DISCOVERY',
  'TECH_EXPERIMENT',
  'SPORT_SCIENCE',
  'OPSLY_STORY',
  'SPLASHITOS_LEARNS',
] as const;
export type ContentFormatTemplate = (typeof contentFormatTemplateValues)[number];

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
  'research',
  'script',
  'storyboard',
  'assets',
  'edit',
  'render',
  'qa',
  'rights_review',
  'human_review',
  'approved',
  'ready_to_publish',
  'published',
  'measured',
  'drafting',
  'assets_pending',
  'ready_to_render',
  'rendering',
  'ready_for_review',
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
  'source_clip',
  'split_screen',
  'freeze_frame',
] as const;
export type ContentVisualType = (typeof contentVisualTypes)[number];

export const contentMotionValues = [
  'static',
  'zoom-in',
  'zoom-out',
  'pan-left',
  'pan-right',
  'slow-zoom-in',
  'slow-zoom-out',
] as const;
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

export const permissionTypeValues = [
  'owned',
  'client_authorized',
  'licensed',
  'public_domain',
  'creative_commons',
  'commentary_candidate',
  'unknown',
] as const;
export type PermissionType = (typeof permissionTypeValues)[number];

export const rightsVerdictValues = ['LOW_RISK', 'REVIEW_REQUIRED', 'BLOCKED'] as const;
export type RightsVerdict = (typeof rightsVerdictValues)[number];

export const trendCandidateStatusValues = [
  'discovered',
  'analyzed',
  'candidate',
  'approved_for_script',
  'rejected',
  'expired',
] as const;
export type TrendCandidateStatus = (typeof trendCandidateStatusValues)[number];

export const transformativeAngleValues = [
  'CRITIQUE',
  'EXPLAIN',
  'TEST',
  'COMPARE',
  'CONTEXTUALIZE',
  'FACT_CHECK',
  'EDUCATE',
  'PARODY',
] as const;
export type TransformativeAngle = (typeof transformativeAngleValues)[number];

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

export interface ContentProvenance {
  owner: string;
  creator: string;
  sourceUrl?: string;
  sourcePlatform?: string;
  license: string;
  permissionType: PermissionType;
  permissionEvidence?: string;
  allowedPlatforms: string[];
  usagePurpose: string;
  expiration?: string;
  transformativePurpose?: string;
  attributionRequired: boolean;
}

export interface BrandKit {
  logo: string | null;
  colors: string[];
  fonts: string[];
  captionPreset: string;
  intro: string;
  outro: string;
  watermark: string | null;
  cta: string;
  characters: string[];
  voiceProfile: string;
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
  mode: ContentMode;
  portal?: ContentPortal;
  formatTemplate?: ContentFormatTemplate;
  question?: string;
  emotion?: string;
  learningGoal?: string;
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
  editorialBeat?: 'WOW' | 'WHY' | 'EXPLORE' | 'UNDERSTAND' | 'HUMAN' | 'TAKEAWAY';
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
  provenance?: ContentProvenance;
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

export interface TranscriptSegment {
  startSec: number;
  endSec: number;
  text: string;
  speaker?: string;
  confidence?: number;
}

export interface ContentTranscript {
  adapter: string;
  language: string;
  text: string;
  segments: TranscriptSegment[];
}

export interface ClipCandidate {
  id: string;
  start: number;
  end: number;
  duration: number;
  transcript: string;
  hook: string;
  category: string;
  score: number;
  reasons: string[];
}

export interface RightsGateResult {
  verdict: RightsVerdict;
  reasons: string[];
  blockedCodes: string[];
}

export interface OriginalContributionScore {
  sourceDuration: number;
  originalDuration: number;
  originalNarrationDuration: number;
  numberOfInterruptions: number;
  researchSections: number;
  originalVisualSections: number;
  experimentSections: number;
  conclusionPresent: boolean;
  score: number;
  reasons: string[];
}

export interface OpportunityScore {
  trendScore: number;
  hookScore: number;
  storyScore: number;
  educationalScore: number;
  brandFitScore: number;
  timelinessScore: number;
  overallOpportunityScore: number;
  reasons: string[];
}

export interface TrendCandidate {
  id: string;
  sourcePlatform: string;
  sourceUrl: string;
  creatorName: string;
  topic: string;
  detectedClaim: string;
  summary: string;
  portal: ContentPortal;
  suggestedQuestion: string;
  suggestedAngle: TransformativeAngle;
  relevanceScore: number;
  educationalScore: number;
  noveltyScore: number;
  trendScore: number;
  rightsRisk: RightsVerdict;
  status: TrendCandidateStatus;
  createdAt: string;
}

export interface TransformativeAngleResult {
  sourceMoment: string;
  claim: string;
  angle: TransformativeAngle;
  novaQuestion: string;
  originalContribution: string;
  researchNeeded: string[];
  suggestedExperiment: string;
  rightsRisk: RightsVerdict;
}

export interface ContentInsight {
  tenantId: string;
  channel: string;
  portal: ContentPortal;
  format: ContentFormatTemplate;
  hookType: string;
  duration: number;
  observation: string;
  confidence: number;
  sampleSize: number;
}

export interface ContentProjectEnvelope {
  schemaVersion: typeof CONTENT_ENGINE_SCHEMA_VERSION;
  project: ContentProject;
  scenes: ContentScene[];
  assets: ContentAsset[];
  renderJobs: ContentRenderJob[];
  approval?: ContentApproval;
  metadata?: ContentMetadataExport;
  transcript?: ContentTranscript;
  clipCandidates?: ClipCandidate[];
  rights?: RightsGateResult;
  contribution?: OriginalContributionScore;
  sourceMoments?: TrendCandidate[];
  research?: string[];
  brandKit?: BrandKit;
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
  mode?: ContentMode;
  portal?: ContentPortal;
  formatTemplate?: ContentFormatTemplate;
  question?: string;
  emotion?: string;
  learningGoal?: string;
}

const ISODateTime = z.string().datetime();

export const ContentProvenanceSchema = z.object({
  owner: z.string().min(1),
  creator: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  sourcePlatform: z.string().optional(),
  license: z.string().min(1),
  permissionType: z.enum(permissionTypeValues),
  permissionEvidence: z.string().optional(),
  allowedPlatforms: z.array(z.string()),
  usagePurpose: z.string().min(1),
  expiration: ISODateTime.optional(),
  transformativePurpose: z.string().optional(),
  attributionRequired: z.boolean(),
});

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
  editorialBeat: z.enum(['WOW', 'WHY', 'EXPLORE', 'UNDERSTAND', 'HUMAN', 'TAKEAWAY']).optional(),
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
  provenance: ContentProvenanceSchema.optional(),
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
  mode: z.enum(contentModeValues),
  portal: z.enum(contentPortalValues).optional(),
  formatTemplate: z.enum(contentFormatTemplateValues).optional(),
  question: z.string().optional(),
  emotion: z.string().optional(),
  learningGoal: z.string().optional(),
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
  mode: z.enum(contentModeValues).optional(),
  portal: z.enum(contentPortalValues).optional(),
  formatTemplate: z.enum(contentFormatTemplateValues).optional(),
  question: z.string().optional(),
  emotion: z.string().optional(),
  learningGoal: z.string().optional(),
});

export type ContentProjectEnvelopeInput = z.infer<typeof ContentProjectEnvelopeSchema>;
