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

// ─── Brand Content Production (Character-driven scripted episodes) ──────────
//
// Distinct from the event-driven ContentDraft flow above: this models
// planned, continuity-driven brand video content (fixed characters across
// a multi-episode series/campaign), not one-off AI-generated per-event posts.

export type CharacterId =
  | 'opsly-founder'
  | 'opsly-robot-luna'
  | 'wavo'
  | 'the-traveler'
  | 'nova'
  | 'peki'
  | 'the-null'
  | 'messenger';

export type NarrativeRole = 'protagonist' | 'supporter' | 'guide' | 'antagonist' | 'messenger';

export interface CharacterVisual {
  silhouette_prompt: string;
  proportions: Record<string, number>;
  face: {
    eye_style: string;
    mouth_style: string;
    expressions: string[];
  };
  hair_style?: string;
  clothing: {
    primary: string;
    accessories: string[];
    symbols: string[];
  };
  color_palette: string[];
  mechanical_elements: string[];
  generation_prompt: string;
  negative_prompt: string;
}

export interface CharacterVoice {
  language: 'es' | 'en' | 'both';
  tone: string;
  speed: 'slow' | 'normal' | 'playful' | 'measured' | 'fast';
  sample_line?: string;
}

export interface CharacterProfile {
  id: CharacterId;
  canonical_name: string;
  also_known_as?: string[];
  role: string;
  personality: {
    archetype: string;
    traits: string[];
    narrative_role: NarrativeRole;
  };
  visual: CharacterVisual;
  voice: CharacterVoice;
  prohibited_variations: string[];
}

export type SeriesId = 'opsly-origins' | 'peki-lab' | 'build-with-opsly' | 'opsly-parallel-path';

export interface Series {
  id: SeriesId;
  name: string;
  description: string;
  theme: string;
  audience: string[];
  typical_duration_sec: number;
  characters: CharacterId[];
  brand: 'opsly' | 'peskids';
  episode_count: number;
  created_at: string;
}

export type EpisodeProductionState =
  | 'idea'
  | 'script'
  | 'storyboard'
  | 'assets'
  | 'rendered'
  | 'reviewed'
  | 'published'
  | 'archived';

export interface EpisodeScene {
  number: number;
  description: string;
  visuals: string;
  copy: string;
  duration_sec: number;
  assets_needed: string[];
}

export interface EpisodeProduction {
  status: EpisodeProductionState;
  created_at: string;
  last_updated: string;
  script_approved_at?: string;
  script_approved_by?: string;
  assets_ready_at?: string;
  rendered_at?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  published_at?: string;
  published_platforms: string[];
  publish_urls: Record<string, string>;
  notes: string[];
}

/** Open language map — 'es'/'en' guaranteed present, other codes (zh, ja, pt, ar, ...) optional. See data/content/canon/LANGUAGES.md. */
export type LocalizedText = Record<string, string> & { es: string; en: string };

export interface Episode {
  id: string;
  series_id: SeriesId;
  episode_number: number;
  title: LocalizedText;
  hook: LocalizedText;
  objective: string;
  audience: string[];
  duration_estimate_sec: number;
  scenes: EpisodeScene[];
  metadata: {
    call_to_action: string;
    captions: LocalizedText;
    hashtags: string[];
    thumbnail_concept: string;
  };
  production: EpisodeProduction;
}

export interface CampaignScheduleEntry {
  episode_id: string;
  scheduled_publish_date: string;
  day_of_week: number;
}

export interface CampaignProductionStatus {
  episodes_planned: number;
  episodes_scripted: number;
  episodes_with_assets: number;
  episodes_rendered: number;
  episodes_reviewed: number;
  episodes_published: number;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  series_ids: SeriesId[];
  duration_days: number;
  start_date: string;
  end_date: string;
  episode_schedule: CampaignScheduleEntry[];
  objectives: string[];
  target_platforms: string[];
  production_status: CampaignProductionStatus;
}

// ─── YouTube Publishing ───────────────────────────────────────────────────────
//
// Uploads an already-rendered local video file to YouTube via the Data API v3.
// Does not render video itself — see rendering/episode-render-plan.ts for that
// (still dry-run-only as of this module). Requires OAuth2 credentials from
// Doppler (never hardcoded) — see docs/runbooks/YOUTUBE-PUBLISHING.md.

export type YouTubePrivacyStatus = 'private' | 'unlisted' | 'public';

export interface YouTubeCredentials {
  client_id: string;
  client_secret: string;
  refresh_token: string;
}

export interface YouTubePublishRequest {
  /** Absolute path to an already-rendered local video file (mp4). */
  file_path: string;
  title: string;
  description: string;
  tags: string[];
  /** YouTube category id, e.g. '28' = Science & Technology. Defaults to '22' (People & Blogs). */
  category_id?: string;
  privacy_status: YouTubePrivacyStatus;
  /**
   * Required, no default. YouTube's self-declared "made for kids" flag —
   * legally required (COPPA) for children-directed content. Get this wrong
   * and monetization/comments/personalized-ads behavior on the video is wrong.
   */
  made_for_kids: boolean;
  playlist_id?: string;
}

export interface YouTubePublishResult {
  video_id: string;
  url: string;
  uploaded_at: string;
}
