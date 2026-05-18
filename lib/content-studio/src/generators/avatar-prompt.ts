import type { TenantContentProfile } from '../types.js';

export interface AvatarPrompt {
  style: string;
  description: string;
  color: string;
  prompt: string;
}

export function generateAvatarPrompt(profile: TenantContentProfile): AvatarPrompt {
  const basePrompts = {
    minimal: {
      style: 'minimal',
      description: 'Clean, geometric shapes, modern aesthetic',
      prompt: (brandColor: string, brandName: string) =>
        `Create a minimal avatar for ${brandName}. Style: simple geometric shapes, modern and clean. Primary color: ${brandColor}. Use 2-3 shapes maximum. No text. Square format 512x512px.`,
    },
    geometric: {
      style: 'geometric',
      description: 'Bold geometric patterns, contemporary',
      prompt: (brandColor: string, brandName: string) =>
        `Create a geometric avatar for ${brandName}. Style: bold geometric patterns and shapes. Primary color: ${brandColor}. Modern and professional. Square format 512x512px.`,
    },
    illustrated: {
      style: 'illustrated',
      description: 'Hand-drawn illustration style',
      prompt: (brandColor: string, brandName: string) =>
        `Create an illustrated avatar for ${brandName}. Style: hand-drawn, friendly, approachable. Primary color: ${brandColor}. Illustration style. Square format 512x512px.`,
    },
    photo: {
      style: 'photo',
      description: 'Professional photography',
      prompt: (brandColor: string, brandName: string) =>
        `Create a professional photo avatar for ${brandName}. Style: polished professional photography. Accent color: ${brandColor}. Professional and trustworthy. Square format 512x512px.`,
    },
  };

  const selectedStyle = profile.avatar_style || 'minimal';
  const styleConfig = basePrompts[selectedStyle];

  if (!styleConfig) {
    throw new Error(`Unknown avatar style: ${selectedStyle}`);
  }

  return {
    style: styleConfig.style,
    description: styleConfig.description,
    color: profile.brand_color,
    prompt: styleConfig.prompt(profile.brand_color, profile.brand_name),
  };
}

export function generateAvatarPrompts(
  profile: TenantContentProfile,
  styles: TenantContentProfile['avatar_style'][] = ['minimal'],
): AvatarPrompt[] {
  return styles.map((style) => {
    const tempProfile = { ...profile, avatar_style: style };
    return generateAvatarPrompt(tempProfile);
  });
}
