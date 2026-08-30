import { describe, expect, it } from 'vitest';
import { buildRenderPlan, formatRenderPlan } from '../render/render-plan.js';
import { getChannelPreset } from '../presets/index.js';
import type { Asset, ContentProject, Scene } from '../domain/types.js';

const project: ContentProject = {
  id: 'p1',
  tenantId: 't1',
  channel: 'opsly-universe',
  series: 's',
  episode: 1,
  title: 'T',
  slug: 't',
  goal: '',
  audience: '',
  format: '9:16',
  status: 'ready_to_render',
  preset: 'opsly-universe',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const scenes: Scene[] = [
  { id: 's1', projectId: 'p1', order: 1, durationMs: 3000, visualType: 'image', assetRefs: ['a1'], caption: 'Hi', transition: 'cut', motion: 'zoom-in' },
  { id: 's2', projectId: 'p1', order: 2, durationMs: 2000, visualType: 'image', assetRefs: ['a2'], voiceover: 'v1', transition: 'cut', motion: 'static' },
];

const assets: Asset[] = [
  { id: 'a1', tenantId: 't1', projectId: 'p1', type: 'image', path: 'scene-01.png', source: 'manual', license: 'x', checksum: 'x', metadata: {} },
  { id: 'a2', tenantId: 't1', projectId: 'p1', type: 'image', path: 'scene-02.png', source: 'manual', license: 'x', checksum: 'x', metadata: {} },
  { id: 'v1', tenantId: 't1', projectId: 'p1', type: 'voice', path: 'scene-02-voice.mp3', source: 'manual', license: 'x', checksum: 'x', metadata: {} },
];

describe('buildRenderPlan', () => {
  it('orders scenes and resolves asset paths without touching disk or ffmpeg', () => {
    const preset = getChannelPreset('opsly-universe');
    const plan = buildRenderPlan(project, scenes, assets, preset, '/out/final.mp4');
    expect(plan.scenes).toHaveLength(2);
    expect(plan.scenes[0].visualAssetPath).toBe('scene-01.png');
    expect(plan.scenes[1].voiceAssetPath).toBe('scene-02-voice.mp3');
    expect(plan.totalDurationSec).toBe(5);
    expect(plan.resolution).toBe('1080x1920');
    expect(plan.estimatedOutputPath).toBe('/out/final.mp4');
  });

  it('sorts by scene.order even if input array is unsorted', () => {
    const preset = getChannelPreset('opsly-universe');
    const reversed = [...scenes].reverse();
    const plan = buildRenderPlan(project, reversed, assets, preset, '/out/final.mp4');
    expect(plan.scenes[0].order).toBe(1);
    expect(plan.scenes[1].order).toBe(2);
  });
});

describe('formatRenderPlan', () => {
  it('renders a human-readable plan with per-scene and final summary lines', () => {
    const preset = getChannelPreset('opsly-universe');
    const plan = buildRenderPlan(project, scenes, assets, preset, '/out/final.mp4');
    const text = formatRenderPlan(plan);
    expect(text).toContain('Scene 1 → 3.0s');
    expect(text).toContain('caption: Hi');
    expect(text).toContain('Scene 2 → 2.0s');
    expect(text).toContain('voice: scene-02-voice.mp3');
    expect(text).toContain('Final:');
    expect(text).toContain('1080x1920');
    expect(text).toContain('5.0 sec');
    expect(text).toContain('estimated output: /out/final.mp4');
  });
});
