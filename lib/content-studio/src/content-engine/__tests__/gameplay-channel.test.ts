import { describe, expect, it } from 'vitest';
import { ingestOwnedVideo, discoverProjectClipsFromAudio, ingestPrecutHighlight, preparePrecutHighlight } from '../pipeline.js';
import { loadContentChannelPreset } from '../presets.js';
import { featuredCharacterIdsForChannel } from '../universe-bridge.js';
import { ffmpegAvailable, generateOwnedFixture } from '../ffmpeg.js';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const skip = !ffmpegAvailable();

describe.skipIf(skip)('icso-gaming-tbd channel', () => {
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

describe.skipIf(!ffmpegAvailable())('discoverProjectClipsFromAudio', () => {
  it('populates clipCandidates without requiring a transcript', async () => {
    const baseDir = mkdtempSync(path.join(os.tmpdir(), 'gameplay-discovery-'));
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
    const fixture = path.join(baseDir, 'gameplay.mp4');
    await generateOwnedFixture(fixture, 6);
    let envelope = await ingestOwnedVideo({
      tenantId: 'icso-gaming-tbd',
      filePath: fixture,
      mode: 'original',
      baseDir,
    });
    expect(envelope.transcript).toBeUndefined();
    envelope = await discoverProjectClipsFromAudio(envelope, baseDir);
    expect(envelope.clipCandidates?.length).toBeGreaterThan(0);
    expect(envelope.project.status).toBe('edit');
  });
});

describe.skipIf(!ffmpegAvailable())('ingestPrecutHighlight', () => {
  it('sets a single full-duration high-confidence clip candidate, no discovery step', async () => {
    const baseDir = mkdtempSync(path.join(os.tmpdir(), 'nvidia-highlight-'));
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
    const fixture = path.join(baseDir, 'highlight.mp4');
    await generateOwnedFixture(fixture, 8);
    const envelope = await ingestPrecutHighlight({ tenantId: 'icso-gaming-tbd', filePath: fixture, baseDir });
    expect(envelope.clipCandidates).toHaveLength(1);
    expect(envelope.clipCandidates?.[0]).toMatchObject({ start: 0, category: 'nvidia_highlight', score: 100 });
    expect(envelope.clipCandidates?.[0].end).toBeGreaterThan(7);
    expect(envelope.project.status).toBe('edit');
  });

  it('prepares a highlight as a rendered human-review draft', async () => {
    const baseDir = mkdtempSync(path.join(os.tmpdir(), 'nvidia-highlight-prepare-'));
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
        subtitleStyle: { fontSize: 64, primaryColor: '#F8FAFC', outlineColor: '#0A0A0A', outlineWidth: 6, shadowColor: '#0A0A0A', shadowOffset: 3, alignment: 2, marginV: 180 },
        safeArea: { top: 120, right: 90, bottom: 260, left: 90 },
        transitionStyle: 'fast-cut',
        musicLevel: -18,
        voiceLevel: -3,
        brandColors: ['#7C3AED', '#1E1B4B', '#0A0A0A'],
        logo: null,
        intro: 'TBD',
        outro: 'TBD',
        ctaStyle: 'TBD',
        sceneDurationLimits: { minMs: 1000, maxMs: 4000 },
        motionDefaults: ['zoom-in', 'static'],
        tone: 'TBD',
      }),
    );
    const fixture = path.join(baseDir, 'highlight-prepare.mp4');
    await generateOwnedFixture(fixture, 4);

    const envelope = await preparePrecutHighlight({ tenantId: 'icso-gaming-tbd', filePath: fixture, baseDir });

    expect(envelope.renderJobs).toHaveLength(1);
    expect(envelope.scenes).toHaveLength(1);
    expect(envelope.approval?.state).toBe('ready_for_review');
    expect(envelope.project.status).toBe('human_review');
  }, 20_000);
});

import { runContentQaCheck } from '../pipeline.js';
import type { ContentProjectEnvelope } from '../types.js';

function baseEnvelopeForQa(): ContentProjectEnvelope {
  return {
    schemaVersion: 2,
    project: {
      id: 'qa-demo',
      tenantId: 'icso-gaming-tbd',
      channel: 'icso-gaming-tbd',
      series: 'demo',
      episode: '1',
      title: 'QA Demo',
      slug: 'qa-demo',
      goal: 'engagement',
      audience: 'general',
      format: 'youtube_short',
      status: 'qa',
      preset: 'icso-gaming-tbd',
      mode: 'original',
      createdAt: '2026-09-08T00:00:00.000Z',
      updatedAt: '2026-09-08T00:00:00.000Z',
    },
    scenes: [],
    assets: [],
    renderJobs: [],
  };
}

describe('runContentQaCheck', () => {
  it('flags when there are no render jobs', () => {
    expect(runContentQaCheck(baseEnvelopeForQa())).toContain('no_render_job');
  });

  it('flags a failed render job', () => {
    const envelope = baseEnvelopeForQa();
    envelope.renderJobs = [
      { id: 'r1', projectId: envelope.project.id, status: 'failed', logs: [], error: 'boom' },
    ];
    expect(runContentQaCheck(envelope)).toContain('render_failed');
  });

  it('flags when the rights gate is BLOCKED', () => {
    const envelope = baseEnvelopeForQa();
    envelope.renderJobs = [{ id: 'r1', projectId: envelope.project.id, status: 'completed', logs: [], outputPath: 'x.mp4' }];
    envelope.rights = { verdict: 'BLOCKED', reasons: ['no provenance'], blockedCodes: ['missing_provenance'] };
    expect(runContentQaCheck(envelope)).toContain('rights_blocked');
  });

  it('returns no flags for a clean, completed, low-risk project', () => {
    const envelope = baseEnvelopeForQa();
    envelope.renderJobs = [{ id: 'r1', projectId: envelope.project.id, status: 'completed', logs: [], outputPath: 'x.mp4' }];
    envelope.rights = { verdict: 'LOW_RISK', reasons: ['owned'], blockedCodes: [] };
    envelope.clipCandidates = [
      { id: 'c1', start: 0, end: 10, duration: 10, transcript: '', hook: 'h', category: 'audio_peak', score: 50, reasons: [] },
    ];
    expect(runContentQaCheck(envelope)).toEqual([]);
  });
});
