import { describe, expect, it } from 'vitest';
import { SafeFfmpegAdapter } from '../ffmpeg.js';

const preset = {
  channel: 'opsly-universe' as const,
  name: 'OPSLY Universe',
  resolution: { width: 1080, height: 1920 },
  aspectRatio: '9:16' as const,
  fps: 30,
  defaultDurationMs: 45000,
  font: 'Inter',
  subtitleStyle: {
    fontSize: 58,
    primaryColor: '#ffffff',
    outlineColor: '#000000',
    outlineWidth: 7,
    shadowColor: '#000000',
    shadowOffset: 4,
    alignment: 2,
    marginV: 210,
  },
  safeArea: { top: 140, right: 100, bottom: 280, left: 100 },
  transitionStyle: 'cinematic' as const,
  musicLevel: -23,
  voiceLevel: -4,
  brandColors: ['#7C3AED'],
  logo: null,
  intro: 'OPSLY Universe',
  outro: 'Estabas construyendo el mapa',
  ctaStyle: 'mythic soft',
  sceneDurationLimits: { minMs: 2000, maxMs: 7000 },
  motionDefaults: ['slow-zoom-in', 'slow-zoom-out', 'static'] as const,
  tone: 'cinematic',
};

describe('content-engine ffmpeg adapter', () => {
  const adapter = new SafeFfmpegAdapter('ffmpeg', 'ffprobe');

  it('builds safe scene clip args', () => {
    const args = adapter.buildSceneClipArgs({
      imagePath: '/tmp/input image.jpg',
      audioPath: '/tmp/input audio.aac',
      outputPath: '/tmp/output.mp4',
      durationMs: 2500,
      preset,
      motion: 'zoom-in',
    });

    expect(args).toContain('/tmp/input image.jpg');
    expect(args).toContain('/tmp/output.mp4');
    expect(args).toContain('libx264');
    expect(args.join(' ')).toContain('zoompan');
  });

  it('builds thumbnail args without shell execution', () => {
    const args = adapter.buildThumbnailArgs({
      sourcePath: '/tmp/source.mp4',
      outputPath: '/tmp/thumb.jpg',
      preset,
      title: 'Todo empezó con una pregunta',
    });

    expect(args).toContain('-frames:v');
    expect(args).toContain('/tmp/thumb.jpg');
  });

  it('builds mix audio args only for multiple inputs', () => {
    expect(() => adapter.buildMixAudioArgs({ sourcePaths: ['/tmp/a.aac'], outputPath: '/tmp/out.aac' })).toThrow(
      'mixAudio requires at least two source paths'
    );
  });
});
