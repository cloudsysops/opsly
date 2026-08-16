import fs from 'node:fs/promises';
import path from 'node:path';
import type { BrandKit, ContentChannel, ContentChannelPreset } from './types.js';
import { resolveRepoRoot } from './paths.js';

const CHANNELS: ContentChannel[] = ['bitsitos', 'splashitos', 'opsly-universe', 'peskids'];

export async function loadContentChannelPreset(
  channel: ContentChannel,
  baseDir = process.cwd()
): Promise<ContentChannelPreset> {
  const presetPath = path.join(resolveRepoRoot(baseDir), 'config', 'content-channels', `${channel}.json`);
  const raw = await fs.readFile(presetPath, 'utf8');
  const parsed = JSON.parse(raw) as ContentChannelPreset;
  if (parsed.channel !== channel) {
    throw new Error(`Preset at ${presetPath} has channel "${parsed.channel}", expected "${channel}"`);
  }
  return parsed;
}

export async function loadAllContentChannelPresets(baseDir = process.cwd()): Promise<ContentChannelPreset[]> {
  return Promise.all(CHANNELS.map((channel) => loadContentChannelPreset(channel, baseDir)));
}

export function brandKitFromPreset(preset: ContentChannelPreset): BrandKit {
  return {
    logo: preset.logo,
    colors: [...preset.brandColors],
    fonts: [preset.font],
    captionPreset: preset.ctaStyle,
    intro: preset.intro,
    outro: preset.outro,
    watermark: preset.logo,
    cta: preset.ctaStyle,
    characters: charactersForChannel(preset.channel),
    voiceProfile: preset.tone,
  };
}

export function charactersForChannel(channel: ContentChannel): string[] {
  if (channel === 'opsly-universe') return ['NØVA', 'THE TRAVELER'];
  if (channel === 'splashitos' || channel === 'peskids') return ['WAVO', 'NØVA'];
  return ['NØVA'];
}

export function contentChannelPresetDefaults(preset: ContentChannelPreset) {
  return {
    resolution: `${preset.resolution.width}x${preset.resolution.height}`,
    durationMs: preset.defaultDurationMs,
    fps: preset.fps,
    motionDefaults: [...preset.motionDefaults],
    safeArea: { ...preset.safeArea },
  };
}
