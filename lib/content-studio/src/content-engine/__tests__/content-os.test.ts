import { mkdtempSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { discoverClips } from '../clip-discovery.js';
import { evaluateRightsGate, scoreOriginalContribution } from '../rights.js';
import { proposeTransformativeAngle, scoreOpportunity } from '../angles.js';
import { ownedFixtureTranscript, transcribeMedia } from '../transcribe.js';
import { assertSameTenant, createProjectEnvelope, setProjectApproval } from '../storage.js';
import { loadContentCharacters, loadContentPortals, loadContentFormats } from '../taxonomy.js';
import { brandKitFromPreset, loadContentChannelPreset } from '../presets.js';
import { sanitizeDrawtext, ffmpegAvailable } from '../ffmpeg.js';
import { publishPubliclyNotImplemented } from '../publishing.js';
import { createManualTrendCandidate } from '../trends.js';
import { contentOsCapabilityMap } from '../capabilities.js';
import type { ContentProjectEnvelope } from '../types.js';

function emptyEnvelope(tenantId: string, mode: 'original' | 'repurpose' | 'commentary'): ContentProjectEnvelope {
  return {
    schemaVersion: 2,
    project: {
      id: `${tenantId}-demo`,
      tenantId,
      channel: 'opsly-universe',
      series: 'demo',
      episode: '1',
      title: 'Demo',
      slug: 'demo',
      goal: 'education',
      audience: 'general',
      format: 'youtube_short',
      status: 'idea',
      preset: 'opsly-universe',
      mode,
      createdAt: '2026-08-16T00:00:00.000Z',
      updatedAt: '2026-08-16T00:00:00.000Z',
    },
    scenes: [],
    assets: [],
    renderJobs: [],
  };
}

describe('content os contracts', () => {
  it('discovers five scored clips from a real transcript', () => {
    const clips = discoverClips(ownedFixtureTranscript(), { limit: 5 });
    expect(clips).toHaveLength(5);
    expect(clips[0].score).toBeGreaterThan(clips[4].score);
    expect(clips[0].reasons.length).toBeGreaterThan(0);
    expect(clips.every((clip) => clip.end > clip.start)).toBe(true);
  });

  it('blocks unknown provenance and does not claim fair use', () => {
    const result = evaluateRightsGate(emptyEnvelope('opsly-universe', 'original'));
    expect(result.verdict).toBe('BLOCKED');
    expect(JSON.stringify(result)).not.toContain('FAIR_USE');
  });

  it('requires client authorization for repurpose', () => {
    const envelope = emptyEnvelope('creator-juan', 'repurpose');
    envelope.assets.push({
      id: 'a1',
      tenantId: 'creator-juan',
      projectId: envelope.project.id,
      type: 'video',
      path: 'x.mp4',
      source: 'x.mp4',
      license: 'unknown',
      checksum: 'abc',
      metadata: {},
      provenance: {
        owner: 'other',
        creator: 'other',
        license: 'unknown',
        permissionType: 'commentary_candidate',
        allowedPlatforms: [],
        usagePurpose: 'repurpose',
        attributionRequired: false,
      },
    });
    expect(evaluateRightsGate(envelope).verdict).toBe('REVIEW_REQUIRED');
  });

  it('isolates tenant on project create', async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'content-os-'));
    mkdirSync(path.join(root, 'config', 'content-channels'), { recursive: true });
    writeFileSync(
      path.join(root, 'config', 'content-channels', 'opsly-universe.json'),
      JSON.stringify({
        channel: 'opsly-universe',
        name: 'OPSLY Universe',
        resolution: { width: 1080, height: 1920 },
        aspectRatio: '9:16',
        fps: 30,
        defaultDurationMs: 1000,
        font: 'Inter',
        subtitleStyle: {
          fontSize: 40,
          primaryColor: '#fff',
          outlineColor: '#000',
          outlineWidth: 1,
          shadowColor: '#000',
          shadowOffset: 1,
          alignment: 2,
          marginV: 10,
        },
        safeArea: { top: 1, right: 1, bottom: 1, left: 1 },
        transitionStyle: 'cinematic',
        musicLevel: 0,
        voiceLevel: 0,
        brandColors: ['#000'],
        logo: null,
        intro: 'i',
        outro: 'o',
        ctaStyle: 'c',
        sceneDurationLimits: { minMs: 1, maxMs: 2 },
        motionDefaults: ['static'],
        tone: 't',
      })
    );
    writeFileSync(path.join(root, 'package.json'), '{}\n');
    const a = await createProjectEnvelope({
      tenantId: 'creator-juan',
      channel: 'opsly-universe',
      series: 's',
      title: 'One',
      goal: 'education',
      audience: 'a',
      format: 'youtube_short',
    }, root);
    const b = await createProjectEnvelope({
      tenantId: 'peskids',
      channel: 'opsly-universe',
      series: 's',
      title: 'Two',
      goal: 'education',
      audience: 'a',
      format: 'youtube_short',
    }, root);
    expect(a.project.tenantId).toBe('creator-juan');
    expect(b.project.tenantId).toBe('peskids');
    expect(a.project.id).not.toBe(b.project.id);
  });

  it('loads portals and formats from config, not UI hardcoding', () => {
    const portals = loadContentPortals();
    const formats = loadContentFormats();
    expect(portals.map((item) => item.id)).toContain('FUTURE');
    expect(formats.map((item) => item.id)).toContain('NOVA_REACTS');
  });

  it('scores opportunity without viral probability language', () => {
    const score = scoreOpportunity({ educationalScore: 90, hookScore: 80 });
    expect(score.overallOpportunityScore).toBeGreaterThan(40);
    expect(JSON.stringify(score)).not.toContain('viral');
  });

  it('proposes a transformative TEST angle', () => {
    const result = proposeTransformativeAngle({
      sourceMoment: 'synthetic',
      claim: 'AI will replace every programmer',
      portal: 'FUTURE',
    });
    expect(result.angle).toBe('TEST');
    expect(result.rightsRisk).toBe('REVIEW_REQUIRED');
  });

  it('scores original contribution as editorial QA only', () => {
    const score = scoreOriginalContribution({
      sourceDuration: 10,
      originalDuration: 8,
      originalNarrationDuration: 8,
      numberOfInterruptions: 3,
      researchSections: 2,
      originalVisualSections: 2,
      experimentSections: 1,
      conclusionPresent: true,
    });
    expect(score.score).toBeGreaterThan(40);
  });

  it('sanitizes drawtext for allowlisted ffmpeg filters', () => {
    expect(sanitizeDrawtext("hi:there['x']")).not.toContain(':');
    expect(sanitizeDrawtext("hi:there['x']")).not.toContain("'");
  });

  it('does not invent a transcript when sidecar is missing', async () => {
    await expect(transcribeMedia(path.join(os.tmpdir(), `missing-${Date.now()}.mp4`))).rejects.toThrow(/BLOCKED_/);
  });

  it('loads brand kit from channel config', async () => {
    const preset = await loadContentChannelPreset('opsly-universe');
    const kit = brandKitFromPreset(preset);
    expect(kit.characters).toContain('NØVA');
    expect(kit.characters).toContain('THE TRAVELER');
    expect(kit.characters).toContain('Echo');
    expect(kit.colors.length).toBeGreaterThan(0);
  });

  it('uses Universe tenant adaptation for Peskids brand kit, not a duplicate lore file', async () => {
    const preset = await loadContentChannelPreset('peskids');
    const kit = brandKitFromPreset(preset);
    expect(kit.characters).toEqual(expect.arrayContaining(['Orion', 'Kai', 'Wavo']));
    expect(kit.characters).not.toContain('NØVA');
  });

  it('marks owned original content as LOW_RISK', () => {
    const envelope = emptyEnvelope('opsly-universe', 'original');
    envelope.assets.push({
      id: 'owned',
      tenantId: 'opsly-universe',
      projectId: envelope.project.id,
      type: 'video',
      path: 'owned.mp4',
      source: 'owned.mp4',
      license: 'all-rights-reserved',
      checksum: 'abc',
      metadata: {},
      provenance: {
        owner: 'opsly-universe',
        creator: 'opsly-universe',
        license: 'all-rights-reserved',
        permissionType: 'owned',
        allowedPlatforms: ['youtube'],
        usagePurpose: 'original',
        attributionRequired: false,
      },
    });
    expect(evaluateRightsGate(envelope).verdict).toBe('LOW_RISK');
  });

  it('transitions approval to human review then approved', () => {
    const queued = setProjectApproval(emptyEnvelope('opsly-universe', 'original'), {
      state: 'ready_for_review',
    });
    expect(queued.project.status).toBe('human_review');
    const approved = setProjectApproval(queued, {
      state: 'approved',
      approvedBy: 'human',
      approvedAt: '2026-08-16T00:00:00.000Z',
    });
    expect(approved.project.status).toBe('approved');
  });

  it('enforces tenant isolation on assertSameTenant', () => {
    expect(() => assertSameTenant(emptyEnvelope('creator-juan', 'original'), 'peskids')).toThrow(/TENANT_ISOLATION/);
  });

  it('keeps clip boundaries inside 8-45s', () => {
    const clips = discoverClips(ownedFixtureTranscript(), { minSec: 8, maxSec: 45, limit: 5 });
    expect(clips.every((clip) => clip.duration >= 8 && clip.duration <= 45)).toBe(true);
  });

  it('registers a trend candidate without downloading media', () => {
    const candidate = createManualTrendCandidate({
      tenantId: 'opsly-universe',
      sourceUrl: 'https://example.invalid/moment',
      creatorName: 'fixture',
      topic: 'AI',
      claim: 'AI will replace every programmer',
    });
    expect(candidate.status).toBe('discovered');
    expect(candidate.rightsRisk).toBe('REVIEW_REQUIRED');
    expect(candidate.suggestedCharacterIds).toEqual(expect.arrayContaining(['nova', 'echo']));
  });

  it('does not implement public publishing in V1', () => {
    expect(() => publishPubliclyNotImplemented('youtube')).toThrow(/BLOCKED_PUBLISHING_ADAPTER/);
  });

  it('does not invent analytics', () => {
    expect(contentOsCapabilityMap().analytics).toContain('no-metrics');
  });

  it('loads characters from Universe canon, not a parallel JSON registry', () => {
    const names = loadContentCharacters().map((item) => item.name);
    expect(names).toEqual(
      expect.arrayContaining(['NØVA', 'THE TRAVELER', 'Wavo', 'Orion', 'Kai', 'Echo', 'Lyra', 'Maya', 'Atlas'])
    );
    expect(existsSync(path.join(process.cwd(), 'config', 'content-characters.json'))).toBe(false);
  });

  it.skipIf(!ffmpegAvailable())('ffmpeg is available for smoke', () => {
    expect(ffmpegAvailable()).toBe(true);
  });
});
