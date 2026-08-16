import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getChannelPreset, listChannels } from '../presets/index.js';

function tempConfigDir(): string {
  return mkdtempSync(join(tmpdir(), 'content-engine-preset-test-'));
}

describe('channel presets', () => {
  it('lists exactly the three required channels', () => {
    expect(listChannels().sort()).toEqual(['bitsitos', 'opsly-universe', 'splashitos']);
  });

  it('loads the bitsitos preset from config/content-channels/bitsitos.json', () => {
    const preset = getChannelPreset('bitsitos');
    expect(preset.channel).toBe('bitsitos');
    expect(preset.resolution).toEqual({ width: 1080, height: 1920 });
    expect(preset.aspectRatio).toBe('9:16');
    expect(preset.brandColors.primary).toBe('#00E5FF');
  });

  it('loads the splashitos preset with turquoise branding', () => {
    const preset = getChannelPreset('splashitos');
    expect(preset.channel).toBe('splashitos');
    expect(preset.brandColors.primary).toBe('#1FC2C2');
  });

  it('loads the opsly-universe preset with cinematic pacing', () => {
    const preset = getChannelPreset('opsly-universe');
    expect(preset.channel).toBe('opsly-universe');
    expect(preset.transitionStyle).toBe('dissolve');
    expect(preset.sceneDurationLimits.maxMs).toBeGreaterThan(preset.sceneDurationLimits.minMs);
  });

  it('caches presets so repeated loads return consistent data', () => {
    const first = getChannelPreset('bitsitos');
    const second = getChannelPreset('bitsitos');
    expect(second).toEqual(first);
  });

  it('throws a clear error for a config file missing required keys', () => {
    const dir = tempConfigDir();
    writeFileSync(join(dir, 'bitsitos.json'), JSON.stringify({ channel: 'bitsitos' }), 'utf8');
    expect(() => getChannelPreset('bitsitos', dir)).toThrow(/missing required key/);
  });

  it('throws for an unknown channel value inside the config file', () => {
    const dir = tempConfigDir();
    writeFileSync(
      join(dir, 'bitsitos.json'),
      JSON.stringify({
        channel: 'not-a-real-channel',
        label: 'x',
        resolution: { width: 1, height: 1 },
        aspect_ratio: '9:16',
        fps: 30,
        default_duration_ms: 1000,
        scene_duration_limits: { min_ms: 1, max_ms: 2 },
        font: { family: 'x', size: 1, weight: 'bold' },
        subtitle_style: { font_size: 1, primary_color: '#fff', outline_color: '#000', outline_width: 1, margin_vertical_px: 1 },
        safe_area: { top_pct: 1, bottom_pct: 1, left_pct: 1, right_pct: 1 },
        transition_style: 'cut',
        music_level_db: -1,
        voice_level_db: -1,
        brand_colors: { primary: '#fff', secondary: '#fff', accent: '#fff' },
        cta_style: 'x',
      }),
      'utf8'
    );
    expect(() => getChannelPreset('bitsitos', dir)).toThrow(/unknown channel/);
  });
});
