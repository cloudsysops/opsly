import { describe, expect, it } from 'vitest';
import { ingestOwnedVideo } from '../pipeline.js';
import { loadContentChannelPreset } from '../presets.js';
import { featuredCharacterIdsForChannel } from '../universe-bridge.js';
import { ffmpegAvailable, generateOwnedFixture } from '../ffmpeg.js';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe.skipIf(!ffmpegAvailable())('icso-gaming-tbd channel', () => {
  it('resolves the gaming channel instead of falling back to opsly-universe', async () => {
    const baseDir = mkdtempSync(path.join(os.tmpdir(), 'gaming-channel-'));
    mkdirSync(path.join(baseDir, 'config', 'content-channels'), { recursive: true });
    writeFileSync(
      path.join(baseDir, 'config', 'content-channels', 'icso-gaming-tbd.json'),
      JSON.stringify({
        channel: 'icso-gaming-tbd',
        name: 'ICSO Gaming (TBD)',
        resolution: { width: 1080, height: 1920 },
        aspectRatio: '9:16',
        fps: 30,
        defaultDurationMs: 30000,
        font: 'Inter',
        subtitleStyle: {
          fontSize: 64,
          primaryColor: '#F8FAFC',
          outlineColor: '#0A0A0A',
          outlineWidth: 6,
          shadowColor: '#0A0A0A',
          shadowOffset: 3,
          alignment: 2,
          marginV: 180,
        },
        safeArea: { top: 120, right: 90, bottom: 260, left: 90 },
        transitionStyle: 'fast-cut',
        musicLevel: -18,
        voiceLevel: -3,
        brandColors: ['#7C3AED', '#1E1B4B', '#0A0A0A'],
        logo: null,
        intro: 'TBD — placeholder, brand not decided',
        outro: 'TBD — placeholder, brand not decided',
        ctaStyle: 'TBD',
        sceneDurationLimits: { minMs: 1000, maxMs: 4000 },
        motionDefaults: ['zoom-in', 'static'],
        tone: 'TBD — youth/adult gaming, not kids-safe by default; placeholder pending brand decision',
      })
    );
    const fixture = path.join(baseDir, 'fixture.mp4');
    await generateOwnedFixture(fixture, 4);
    const envelope = await ingestOwnedVideo({
      tenantId: 'icso-gaming-tbd',
      filePath: fixture,
      mode: 'original',
      baseDir,
    });
    expect(envelope.project.channel).toBe('icso-gaming-tbd');
  });

  it('loads a preset for the gaming channel', async () => {
    const preset = await loadContentChannelPreset('icso-gaming-tbd');
    expect(preset.channel).toBe('icso-gaming-tbd');
  });

  it('has no featured characters yet (placeholder, no brand)', () => {
    expect(featuredCharacterIdsForChannel('icso-gaming-tbd')).toEqual([]);
  });
});
