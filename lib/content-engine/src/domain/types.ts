export type ContentChannel = 'bitsitos' | 'splashitos' | 'opsly-universe';

export type ContentProjectStatus =
  | 'idea'
  | 'drafting'
  | 'assets_pending'
  | 'ready_to_render'
  | 'rendering'
  | 'ready_for_review'
  | 'approved'
  | 'published'
  | 'failed'
  | 'archived';

/** Legal forward transitions. Anything not listed here is rejected. */
export const CONTENT_PROJECT_TRANSITIONS: Record<ContentProjectStatus, ContentProjectStatus[]> = {
  idea: ['drafting', 'archived'],
  drafting: ['assets_pending', 'archived'],
  assets_pending: ['ready_to_render', 'drafting', 'archived'],
  ready_to_render: ['rendering', 'assets_pending', 'archived'],
  rendering: ['ready_for_review', 'failed'],
  ready_for_review: ['approved', 'assets_pending', 'archived'],
  approved: ['published', 'archived'],
  published: ['archived'],
  failed: ['assets_pending', 'archived'],
  archived: [],
};

export interface ContentProject {
  id: string;
  tenantId: string;
  channel: ContentChannel;
  series: string;
  episode: number;
  title: string;
  slug: string;
  goal: string;
  audience: string;
  format: string;
  status: ContentProjectStatus;
  preset: string;
  createdAt: string;
  updatedAt: string;
  approval?: ProjectApproval;
}

export interface ProjectApproval {
  status: 'ready_for_review' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  reviewNotes?: string;
}

export type SceneMotion = 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'static';
export type SceneVisualType = 'image' | 'video';
export type SceneTransition = 'cut' | 'fade' | 'dissolve';

export interface Scene {
  id: string;
  projectId: string;
  order: number;
  durationMs: number;
  visualType: SceneVisualType;
  assetRefs: string[];
  voiceover?: string;
  caption?: string;
  transition: SceneTransition;
  motion: SceneMotion;
}

export type AssetType = 'image' | 'video' | 'audio' | 'voice' | 'music' | 'subtitle' | 'thumbnail';

export interface Asset {
  id: string;
  tenantId: string;
  projectId: string;
  type: AssetType;
  /** Path relative to the tenant's content root (see storage/paths.ts). */
  path: string;
  source: 'manual' | 'generated' | 'placeholder';
  license: string;
  checksum: string;
  metadata: Record<string, unknown>;
}

export type RenderJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface RenderJob {
  id: string;
  projectId: string;
  status: RenderJobStatus;
  startedAt?: string;
  completedAt?: string;
  outputPath?: string;
  logs: string[];
  error?: string;
}
