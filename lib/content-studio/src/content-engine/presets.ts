import fs from 'node:fs/promises';
import path from 'node:path';
import type { ContentChannel, ContentChannelPreset } from './types.js';

export async function loadContentChannelPreset(
  channel: ContentChannel,
  baseDir = process.cwd()
): Promise<ContentChannelPreset> {
  const presetPath = path.join(baseDir, 'config', 'content-channels', `${channel}.json`);
  const raw = await fs.readFile(presetPath, 'utf8');
  const parsed = JSON.parse(raw) as ContentChannelPreset;

  if (parsed.channel !== channel) {
    throw new Error(`Preset at ${presetPath} has channel "${parsed.channel}", expected "${channel}"`);
  }

  return parsed;
}

export async function loadAllContentChannelPresets(baseDir = process.cwd()): Promise<ContentChannelPreset[]> {
  const channels: ContentChannel[] = ['bitsitos', 'splashitos', 'opsly-universe'];
  return Promise.all(channels.map((channel) => loadContentChannelPreset(channel, baseDir)));
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

