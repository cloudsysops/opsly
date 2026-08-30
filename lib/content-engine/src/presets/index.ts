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

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function mapTransition(style: string): RawChannelConfig['transition_style'] {
  if (style === 'fade' || style === 'dissolve') return style;
  if (style === 'cinematic' || style === 'soft-cut') return 'dissolve';
  return 'cut';
}

function normalizeChannelConfig(raw: unknown, sourcePath: string): RawChannelConfig {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Invalid channel preset at ${sourcePath}: not an object`);
  }
  const obj = raw as Record<string, unknown>;
  if ('label' in obj && 'aspect_ratio' in obj) {
    validateRaw(obj, sourcePath);
    return obj;
  }

  const resolution = (obj.resolution ?? {}) as { width?: number; height?: number };
  const width = asNumber(resolution.width, 1080);
  const height = asNumber(resolution.height, 1920);
  const sub = (obj.subtitleStyle ?? {}) as Record<string, unknown>;
  const safe = (obj.safeArea ?? {}) as Record<string, unknown>;
  const limits = (obj.sceneDurationLimits ?? {}) as Record<string, unknown>;
  const colors = Array.isArray(obj.brandColors) ? obj.brandColors.map((item) => String(item)) : [];
  const aspect = obj.aspectRatio;
  if (aspect !== '9:16' && aspect !== '1:1' && aspect !== '16:9') {
    throw new Error(`Invalid channel preset at ${sourcePath}: missing required key "aspectRatio"`);
  }
  const fontFamily = typeof obj.font === 'string' ? obj.font : 'Inter';
  const intro = obj.intro;
  const outro = obj.outro;
  const normalized: RawChannelConfig = {
    channel: asString(obj.channel, ''),
    label: asString(obj.name, asString(obj.channel, '')),
    resolution: { width, height },
    aspect_ratio: aspect,
    fps: asNumber(obj.fps, 30),
    default_duration_ms: asNumber(obj.defaultDurationMs, 30000),
    scene_duration_limits: {
      min_ms: asNumber(limits.minMs, 1000),
      max_ms: asNumber(limits.maxMs, 4000),
    },
    font: { family: fontFamily, size: asNumber(sub.fontSize, 64), weight: 'bold' },
    subtitle_style: {
      font_size: asNumber(sub.fontSize, 64),
      primary_color: asString(sub.primaryColor, '#FFFFFF'),
      outline_color: asString(sub.outlineColor, '#000000'),
      outline_width: asNumber(sub.outlineWidth, 4),
      margin_vertical_px: asNumber(sub.marginV, 160),
    },
    safe_area: {
      top_pct: asNumber(safe.top, 0) / height,
      bottom_pct: asNumber(safe.bottom, 0) / height,
      left_pct: asNumber(safe.left, 0) / width,
      right_pct: asNumber(safe.right, 0) / width,
    },
    transition_style: mapTransition(asString(obj.transitionStyle, 'cut')),
    music_level_db: asNumber(obj.musicLevel, -18),
    voice_level_db: asNumber(obj.voiceLevel, -3),
    brand_colors: {
      primary: colors[0] ?? '#FFFFFF',
      secondary: colors[1] ?? colors[0] ?? '#FFFFFF',
      accent: colors[2] ?? colors[1] ?? '#FFFFFF',
    },
    logo: typeof obj.logo === 'string' ? obj.logo : null,
    intro: typeof intro === 'string' ? { duration_ms: 1500, text: intro } : undefined,
    outro: typeof outro === 'string' ? { duration_ms: 1500, text: outro } : undefined,
    cta_style: asString(obj.ctaStyle, 'default'),
  };
  validateRaw(normalized, sourcePath);
  return normalized;
}

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
  const preset = toChannelPreset(normalizeChannelConfig(raw, path));
  presetCache.set(cacheKey, preset);
  return preset;
}

export function listChannels(): ContentChannel[] {
  return [...KNOWN_CHANNELS];
}
