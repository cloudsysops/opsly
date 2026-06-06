// ─── AI Generation ───────────────────────────────────────────────────────────

export type ContentTopic = 'opsly' | 'technology' | 'motivation';
export type ContentPillar = 'prompts' | 'claude' | 'marketing';
export type ContentSurface = 'youtube_shorts' | 'instagram_reels' | 'instagram_feed';
export type VideoAspectRatio = '9:16' | '1:1' | '16:9';
export type VideoRenderProvider = 'moneyprinterturbo';
export type VideoRenderStatus = 'queued' | 'rendering' | 'completed' | 'failed';

export interface AIGenerationParams {
  topic: ContentTopic;
  tenant_slug: string;
  /** 'both' generates es + en captions in one call */
  language: 'es' | 'en' | 'both';
  /** Default: ['instagram', 'youtube', 'tiktok'] */
  platforms?: string[];
  /** Additional context injected into the AI prompt */
  context?: string;
  tone?: ToneOfVoice;
}

export interface ReelScene {
  scene: string;
  copy: string;
  duration_sec: number;
}

export interface BilingualCaption {
  platform: string;
  es: string;
  en: string;
  hashtags: string[];
  characterCount: number;
}

export interface AIContentResult {
  topic: ContentTopic;
  language: 'es' | 'en' | 'both';
  story_hook: string;
  call_to_action: string;
  image_prompt: string;
  reel_script: ReelScene[];
  captions: BilingualCaption[];
}

// ─── Event-driven Content ─────────────────────────────────────────────────────

export type ContentEventType =
  | 'session_created'
  | 'deployment_success'
  | 'approval_completed'
  | 'branch_merged'
  | 'test_suite_passed'
  | 'security_scan_clean'
  | 'worker_online'
  | 'session_resumed'
  | 'migration_finished';

export type ContentConfidentiality = 'public' | 'internal' | 'secret';

export type ToneOfVoice = 'technical' | 'friendly' | 'corporate' | 'casual';

export type AvatarStyle = 'minimal' | 'geometric' | 'illustrated' | 'photo';

export interface ContentEvent {
  id: string;
  tenant_slug: string;
  event_type: ContentEventType;
  timestamp: string; // ISO8601
  context: Record<string, unknown>;
  confidentiality: ContentConfidentiality;
}

export interface TenantContentProfile {
  tenant_slug: string;
  brand_name: string;
  brand_color: string;
  tone_of_voice: ToneOfVoice;
  language: 'es' | 'en' | 'pt' | 'fr';
  avatar_style: AvatarStyle;
  content_privacy: {
    hide_team_names: boolean;
    hide_metrics: boolean;
    hide_infrastructure: boolean;
    show_only_wins: boolean;
  };
  content_presets?: TenantContentPreset[];
  default_content_preset_slug?: string;
}

export interface TenantContentPreset {
  slug: string;
  label: string;
  platforms: ContentSurface[];
  pillars: ContentPillar[];
  tone_of_voice: ToneOfVoice;
  language: 'es' | 'en' | 'both';
  visual_style: string;
  aspect_ratio: VideoAspectRatio;
  target_duration_sec: number;
  approval_required: boolean;
  render_provider: VideoRenderProvider;
  notes?: string;
}

export interface VideoRenderAsset {
  url: string;
  thumbnail_url?: string;
  subtitle_url?: string;
  duration_sec?: number;
  aspect_ratio?: VideoAspectRatio;
}

export interface VideoRenderManifest {
  provider: VideoRenderProvider;
  status: VideoRenderStatus;
  tenant_slug: string;
  request_id: string;
  draft_id: string;
  preset_slug: string;
  submitted_at: string;
  completed_at?: string;
  job_id?: string;
  output_key?: string;
  asset?: VideoRenderAsset;
  error?: string;
}

export interface VideoRenderRequest {
  tenant_slug: string;
  request_id: string;
  draft_id: string;
  preset: TenantContentPreset;
  draft: ContentDraft;
}

export interface MoneyPrinterTurboRenderConfig {
  base_url: string;
  api_key?: string;
  render_path?: string;
  timeout_ms?: number;
}

export interface MoneyPrinterTurboRenderSubmission {
  ok: true;
  manifest: VideoRenderManifest;
}

export interface ContentDraft {
  id: string;
  tenant_slug: string;
  event_id: string;
  title: string;
  story_hook: string;
  captions: Array<{
    platform: string;
    text: string;
    hashtags: string[];
    characterCount: number;
  }>;
  image_prompt: string;
  reel_script?: Array<{ scene: string; copy: string; duration_sec: number }>;
  call_to_action: string;
  compliance_flags: string[];
  state: 'draft' | 'pending_approval' | 'approved' | 'ready_to_copy' | 'scheduled' | 'published';
  created_at: string;
  approved_at?: string;
  approved_by?: string;
  copy_paste_kit: {
    instagram_caption: string;
    facebook_caption: string;
    linkedin_caption: string;
    x_caption: string;
    tiktok_script: string;
    youtube_shorts_script: string;
    image_url?: string;
  };
}

export interface ComplianceViolation {
  code: string;
  severity: 'warning' | 'error';
  message: string;
  field: string;
}
