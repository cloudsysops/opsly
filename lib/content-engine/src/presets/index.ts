import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ContentChannel } from '../domain/types.js';
import type { ChannelPreset } from './types.js';

export type { ChannelPreset } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// lib/content-engine/(src|dist)/presets -> repo root -> config/content-channels
const DEFAULT_CONFIG_DIR = join(__dirname, '../../../../config/content-channels');

const KNOWN_CHANNELS: ContentChannel[] = ['bitsitos', 'splashitos', 'opsly-universe'];

interface RawChannelConfig {
  channel: string;
  label: string;
  resolution: { width: number; height: number };
  aspect_ratio: '9:16' | '1:1' | '16:9';
  fps: number;
  default_duration_ms: number;
  scene_duration_limits: { min_ms: number; max_ms: number };
  font: { family: string; size: number; weight: 'normal' | 'bold' };
  subtitle_style: {
    font_size: number;
    primary_color: string;
    outline_color: string;
    outline_width: number;
    margin_vertical_px: number;
  };
  safe_area: { top_pct: number; bottom_pct: number; left_pct: number; right_pct: number };
  transition_style: 'cut' | 'fade' | 'dissolve';
  music_level_db: number;
  voice_level_db: number;
  brand_colors: { primary: string; secondary: string; accent: string };
  logo?: string | null;
  intro?: { duration_ms: number; text?: string };
  outro?: { duration_ms: number; text?: string };
  cta_style: string;
}

const REQUIRED_KEYS: Array<keyof RawChannelConfig> = [
  'channel',
  'label',
  'resolution',
  'aspect_ratio',
  'fps',
  'default_duration_ms',
  'scene_duration_limits',
  'font',
  'subtitle_style',
  'safe_area',
  'transition_style',
  'music_level_db',
  'voice_level_db',
  'brand_colors',
  'cta_style',
];

function validateRaw(raw: unknown, sourcePath: string): asserts raw is RawChannelConfig {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Invalid channel preset at ${sourcePath}: not an object`);
  }
  const obj = raw as Record<string, unknown>;
  for (const key of REQUIRED_KEYS) {
    if (!(key in obj)) {
      throw new Error(`Invalid channel preset at ${sourcePath}: missing required key "${key}"`);
    }
  }
  if (!KNOWN_CHANNELS.includes(obj.channel as ContentChannel)) {
    throw new Error(
      `Invalid channel preset at ${sourcePath}: unknown channel "${String(obj.channel)}"`
    );
  }
}

function toChannelPreset(raw: RawChannelConfig): ChannelPreset {
  return {
    channel: raw.channel as ContentChannel,
    label: raw.label,
    resolution: raw.resolution,
    aspectRatio: raw.aspect_ratio,
    fps: raw.fps,
    defaultDurationMs: raw.default_duration_ms,
    sceneDurationLimits: { minMs: raw.scene_duration_limits.min_ms, maxMs: raw.scene_duration_limits.max_ms },
    font: raw.font,
    subtitleStyle: {
      fontSize: raw.subtitle_style.font_size,
      primaryColor: raw.subtitle_style.primary_color,
      outlineColor: raw.subtitle_style.outline_color,
      outlineWidth: raw.subtitle_style.outline_width,
      marginVerticalPx: raw.subtitle_style.margin_vertical_px,
    },
    safeArea: {
      topPct: raw.safe_area.top_pct,
      bottomPct: raw.safe_area.bottom_pct,
      leftPct: raw.safe_area.left_pct,
      rightPct: raw.safe_area.right_pct,
    },
    transitionStyle: raw.transition_style,
    musicLevelDb: raw.music_level_db,
    voiceLevelDb: raw.voice_level_db,
    brandColors: raw.brand_colors,
    logo: raw.logo ?? undefined,
    intro: raw.intro ? { durationMs: raw.intro.duration_ms, text: raw.intro.text } : undefined,
    outro: raw.outro ? { durationMs: raw.outro.duration_ms, text: raw.outro.text } : undefined,
    ctaStyle: raw.cta_style,
  };
}

const presetCache = new Map<string, ChannelPreset>();

/** Loads and validates a channel preset from config/content-channels/<channel>.json. */
export function getChannelPreset(channel: ContentChannel, configDir: string = DEFAULT_CONFIG_DIR): ChannelPreset {
  const cacheKey = `${configDir}:${channel}`;
  const cached = presetCache.get(cacheKey);
  if (cached) return cached;

  const path = join(configDir, `${channel}.json`);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(
      `Failed to load channel preset "${channel}" from ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  validateRaw(raw, path);
  const preset = toChannelPreset(raw);
  presetCache.set(cacheKey, preset);
  return preset;
}

export function listChannels(): ContentChannel[] {
  return [...KNOWN_CHANNELS];
}
