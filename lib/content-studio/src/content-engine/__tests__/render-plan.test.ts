import { describe, expect, it } from 'vitest';
import { buildRenderPlan } from '../render-plan.js';

describe('content-engine render plan', () => {
  it('prints a human readable plan', () => {
    const plan = buildRenderPlan(
      {
        schemaVersion: 1,
        project: {
          id: 'opsly-origins-001',
          tenantId: 'intcloudsysops',
          channel: 'opsly-universe',
          series: 'OPSLY: The Parallel Path',
          episode: 'opsly-origins-001',
          title: 'Todo empezó con una pregunta',
          slug: 'todo-empezo-con-una-pregunta',
          goal: 'education',
          audience: 'families',
          format: 'youtube_short',
          status: 'idea',
          preset: 'opsly-universe',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        scenes: [
          {
            id: 'scene-1',
            projectId: 'opsly-origins-001',
            order: 1,
            durationMs: 2500,
            visualType: 'image',
            assetRefs: ['asset-1'],
            caption: 'Todo empezó con una pregunta.',
            transition: 'cut',
            motion: 'zoom-in',
          },
        ],
        assets: [],
        renderJobs: [],
      },
      {
        channel: 'opsly-universe',
        name: 'OPSLY Universe',
        resolution: { width: 1080, height: 1920 },
        aspectRatio: '9:16',
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
        transitionStyle: 'cinematic',
        musicLevel: -23,
        voiceLevel: -4,
        brandColors: ['#7C3AED'],
        logo: null,
        intro: 'OPSLY Universe',
        outro: 'Estabas construyendo el mapa',
        ctaStyle: 'mythic soft',
        sceneDurationLimits: { minMs: 2000, maxMs: 7000 },
        motionDefaults: ['slow-zoom-in', 'slow-zoom-out', 'static'],
        tone: 'cinematic',
      }
    );

    expect(plan).toContain('Scene 1 → 2.5s');
    expect(plan).toContain('1080x1920');
    expect(plan).toContain('estimated output: artifacts/content/opsly-origins-001/final.mp4');
  });
});
