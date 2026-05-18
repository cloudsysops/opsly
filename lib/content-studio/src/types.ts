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
