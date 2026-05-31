import type {
  ContentSurface,
  TenantContentPreset,
  TenantContentProfile,
  ToneOfVoice,
} from '../types.js';

const defaultSurfaces: ContentSurface[] = [
  'youtube_shorts',
  'instagram_reels',
  'instagram_feed',
];

const defaultPillars = ['prompts', 'claude', 'marketing'] as const;

const basePresets: TenantContentPreset[] = [
  {
    slug: 'youtube_shorts',
    label: 'YouTube Shorts',
    platforms: ['youtube_shorts'],
    pillars: [...defaultPillars],
    tone_of_voice: 'friendly',
    language: 'es',
    visual_style: 'fast-paced vertical video with bold subtitles and crisp cuts',
    aspect_ratio: '9:16',
    target_duration_sec: 45,
    approval_required: true,
    render_provider: 'moneyprinterturbo',
    notes: 'Primary short-form video output for educational and product-led content.',
  },
  {
    slug: 'instagram_reels',
    label: 'Instagram Reels',
    platforms: ['instagram_reels'],
    pillars: [...defaultPillars],
    tone_of_voice: 'friendly',
    language: 'es',
    visual_style: 'polished vertical reel with branded overlays and motion captions',
    aspect_ratio: '9:16',
    target_duration_sec: 30,
    approval_required: true,
    render_provider: 'moneyprinterturbo',
    notes: 'Optimized for shareable short-form content with stronger visual polish.',
  },
  {
    slug: 'instagram_feed',
    label: 'Instagram Feed',
    platforms: ['instagram_feed'],
    pillars: [...defaultPillars],
    tone_of_voice: 'friendly',
    language: 'es',
    visual_style: 'clean square post with subtitle-safe safe zones and brand card framing',
    aspect_ratio: '1:1',
    target_duration_sec: 20,
    approval_required: true,
    render_provider: 'moneyprinterturbo',
    notes: 'For feed-native clips or cover art style assets that support the reel pipeline.',
  },
];

function mergeTone(profileTone: ToneOfVoice | undefined, preset: TenantContentPreset): TenantContentPreset {
  return {
    ...preset,
    tone_of_voice: profileTone ?? preset.tone_of_voice,
  };
}

function mergeLanguage(profileLanguage: TenantContentProfile['language'] | undefined, preset: TenantContentPreset): TenantContentPreset {
  if (!profileLanguage) return preset;
  if (profileLanguage === 'pt' || profileLanguage === 'fr') {
    return { ...preset, language: 'es' };
  }
  return { ...preset, language: profileLanguage };
}

export function getDefaultTenantContentPresets(
  profile?: Pick<TenantContentProfile, 'tone_of_voice' | 'language'>
): TenantContentPreset[] {
  return basePresets.map((preset) => mergeLanguage(profile?.language, mergeTone(profile?.tone_of_voice, preset)));
}

export function resolveTenantContentPreset(
  profile: Pick<TenantContentProfile, 'tone_of_voice' | 'language'> | undefined,
  presetSlug?: string
): TenantContentPreset {
  const presets = getDefaultTenantContentPresets(profile);
  const resolved =
    presets.find((preset) => preset.slug === presetSlug) ?? presets[0] ?? basePresets[0];

  if (!resolved) {
    throw new Error('No content presets available');
  }

  return resolved;
}

export function getDefaultContentSurfaces(): ContentSurface[] {
  return [...defaultSurfaces];
}
