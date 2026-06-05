import { describe, expect, it } from 'vitest';
import {
  getDefaultContentSurfaces,
  getDefaultTenantContentPresets,
  resolveTenantContentPreset,
} from '../tenant-content-presets.js';

describe('tenant content presets', () => {
  it('exposes the default short-form content surfaces', () => {
    expect(getDefaultContentSurfaces()).toEqual([
      'youtube_shorts',
      'instagram_reels',
      'instagram_feed',
    ]);
  });

  it('builds the default preset set with prompts, claude, and marketing pillars', () => {
    const presets = getDefaultTenantContentPresets({ tone_of_voice: 'technical', language: 'es' });

    expect(presets).toHaveLength(3);
    expect(presets.map((preset) => preset.slug)).toEqual([
      'youtube_shorts',
      'instagram_reels',
      'instagram_feed',
    ]);
    expect(presets[0].pillars).toEqual(['prompts', 'claude', 'marketing']);
    expect(presets[0].tone_of_voice).toBe('technical');
    expect(presets[0].language).toBe('es');
  });

  it('resolves a preset by slug and falls back to the default preset', () => {
    const resolved = resolveTenantContentPreset({ tone_of_voice: 'friendly', language: 'en' }, 'youtube_shorts');
    const fallback = resolveTenantContentPreset({ tone_of_voice: 'friendly', language: 'en' }, 'missing');

    expect(resolved.slug).toBe('youtube_shorts');
    expect(resolved.language).toBe('en');
    expect(fallback.slug).toBe('youtube_shorts');
  });
});
