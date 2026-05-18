import type { ContentDraft, ContentEvent } from '../types.js';

export type Platform =
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'x'
  | 'tiktok'
  | 'youtube'
  | 'threads'
  | 'pinterest'
  | 'reddit'
  | 'discord'
  | 'telegram'
  | 'whatsapp';

export interface Caption {
  platform: Platform;
  text: string;
  hashtags: string[];
  characterCount: number;
}

const platformLimits: Record<Platform, { charLimit: number; hasBio: boolean }> = {
  instagram: { charLimit: 2200, hasBio: true },
  facebook: { charLimit: 63206, hasBio: true },
  linkedin: { charLimit: 3000, hasBio: true },
  x: { charLimit: 280, hasBio: false },
  tiktok: { charLimit: 2200, hasBio: true },
  youtube: { charLimit: 5000, hasBio: true },
  threads: { charLimit: 500, hasBio: false },
  pinterest: { charLimit: 500, hasBio: true },
  reddit: { charLimit: 10000, hasBio: false },
  discord: { charLimit: 2000, hasBio: false },
  telegram: { charLimit: 4096, hasBio: false },
  whatsapp: { charLimit: 1024, hasBio: false },
};

const platformHashtags: Record<Platform, string[]> = {
  instagram: ['#shipping', '#devops', '#automation', '#engineering'],
  facebook: ['#shipping', '#devops', '#automation'],
  linkedin: ['#shipping', '#devops', '#automation', '#engineering', '#tech'],
  x: ['#shipping', '#devops', '#eng'],
  tiktok: ['#shipping', '#devops', '#automation', '#fyp'],
  youtube: ['#shipping', '#devops', '#automation', '#engineering'],
  threads: ['#shipping', '#devops'],
  pinterest: ['#shipping', '#devops', '#automation'],
  reddit: [],
  discord: [],
  telegram: [],
  whatsapp: [],
};

function truncateToCharLimit(text: string, charLimit: number): string {
  if (text.length <= charLimit) return text;
  return text.substring(0, charLimit - 3) + '...';
}

export function generateCaption(
  platform: Platform,
  storyHook: string,
  callToAction: string,
): Caption {
  const limit = platformLimits[platform];
  const hashtags = platformHashtags[platform];

  let baseCaption = storyHook;

  if (callToAction) {
    baseCaption += `\n\n${callToAction}`;
  }

  // Platform-specific variations
  const variations: Record<Platform, string> = {
    instagram: `${baseCaption}\n\n${hashtags.join(' ')}`,
    facebook: `${baseCaption}\n\n#shipping #devops #automation`,
    linkedin: `${baseCaption}\n\n#shipping #devops #automation #engineering #tech`,
    x: `${baseCaption} ${hashtags.slice(0, 2).join(' ')}`,
    tiktok: `${baseCaption}\n\n${hashtags.join(' ')} #fyp`,
    youtube: `${baseCaption}\n\n${hashtags.join(' ')}`,
    threads: baseCaption,
    pinterest: baseCaption,
    reddit: baseCaption,
    discord: baseCaption,
    telegram: baseCaption,
    whatsapp: baseCaption,
  };

  const text = truncateToCharLimit(variations[platform], limit.charLimit);

  return {
    platform,
    text,
    hashtags,
    characterCount: text.length,
  };
}

export function generateCaptions(
  storyHook: string,
  callToAction: string,
  platforms?: Platform[],
): Caption[] {
  const targetPlatforms =
    platforms || (Object.keys(platformLimits) as Platform[]);

  return targetPlatforms.map((platform) =>
    generateCaption(platform, storyHook, callToAction),
  );
}

export function enrichContentDraftWithCaptions(
  draft: Partial<ContentDraft>,
  platforms?: Platform[],
): Partial<ContentDraft> {
  if (!draft.story_hook || !draft.call_to_action) {
    return draft;
  }

  const captions = generateCaptions(
    draft.story_hook,
    draft.call_to_action,
    platforms,
  );

  return {
    ...draft,
    captions: captions.map((cap) => ({
      platform: cap.platform,
      text: cap.text,
      hashtags: cap.hashtags,
      characterCount: cap.characterCount,
    })),
    copy_paste_kit: {
      instagram_caption: captions.find((c) => c.platform === 'instagram')?.text || '',
      facebook_caption: captions.find((c) => c.platform === 'facebook')?.text || '',
      linkedin_caption: captions.find((c) => c.platform === 'linkedin')?.text || '',
      x_caption: captions.find((c) => c.platform === 'x')?.text || '',
      tiktok_script: captions.find((c) => c.platform === 'tiktok')?.text || '',
      youtube_shorts_script:
        captions.find((c) => c.platform === 'youtube')?.text || '',
    },
  };
}
