import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ffmpegAvailable, generatePeakedGameplayFixture } from '../ffmpeg.js';
import { getContentProjectArtifactsRoot } from '../paths.js';
import { prepareGameplaySession } from '../pipeline.js';
import { enqueueApprovedPublishJob } from '../publishing.js';
import { setProjectApproval } from '../storage.js';

function writeGamingChannel(baseDir: string): void {
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
      intro: 'TBD',
      outro: 'TBD',
      ctaStyle: 'TBD',
      sceneDurationLimits: { minMs: 1000, maxMs: 4000 },
      motionDefaults: ['zoom-in', 'static'],
      tone: 'TBD',
    }),
  );
}

describe.skipIf(!ffmpegAvailable())('prepareGameplaySession', () => {
  it('turns a peaked session into review-ready clips without deleting the source', async () => {
    const baseDir = path.join(os.tmpdir(), `gameplay-session-${Date.now()}`);
    writeGamingChannel(baseDir);
    const sourceFile = path.join(baseDir, 'instant-replay-session.mp4');
    await generatePeakedGameplayFixture(sourceFile);

    const envelope = await prepareGameplaySession({
      tenantId: 'icso-gaming-tbd',
      filePath: sourceFile,
      baseDir,
      game: 'unknown',
      captureSource: 'synthetic',
    });

    expect(existsSync(sourceFile)).toBe(true);
    expect(envelope.project.status).toBe('human_review');
    expect(envelope.approval?.state).toBe('ready_for_review');
    expect(envelope.session?.processingStatus).toBe('ready_for_review');
    expect(envelope.session?.sourceFile).toBe(sourceFile);
    expect(envelope.selectedClipIds?.length).toBeGreaterThanOrEqual(1);
    expect(envelope.selectedClipIds?.length).toBeLessThanOrEqual(5);
    expect(envelope.renderJobs[0]?.status).toBe('completed');
    expect(envelope.renderJobs[0]?.outputPath && existsSync(envelope.renderJobs[0].outputPath)).toBe(true);
    expect(envelope.clipCandidates?.every((clip) => clip.hook === 'Gameplay highlight')).toBe(true);
    expect(envelope.publishJobs ?? []).toEqual([]);

    const artifacts = getContentProjectArtifactsRoot(envelope.project.id, baseDir);
    expect(existsSync(path.join(artifacts, 'final.mp4'))).toBe(true);
    expect(existsSync(path.join(artifacts, 'captions.srt'))).toBe(true);
    expect(existsSync(path.join(artifacts, 'metadata.json'))).toBe(true);
    expect(existsSync(path.join(artifacts, 'rights.json'))).toBe(true);
    expect(existsSync(path.join(artifacts, 'qa.json'))).toBe(true);
    expect(existsSync(path.join(artifacts, 'manifest.json'))).toBe(true);
    const rights = JSON.parse(readFileSync(path.join(artifacts, 'rights.json'), 'utf8')) as {
      MUSIC_RIGHTS: string;
      publishReady: boolean;
    };
    expect(rights.MUSIC_RIGHTS).toBe('UNKNOWN');
    expect(rights.publishReady).toBe(false);

    const approved = setProjectApproval(envelope, {
      state: 'approved',
      approvedBy: 'e2e',
      approvedAt: new Date().toISOString(),
    });
    const queued = enqueueApprovedPublishJob(approved);
    expect(queued.publishJobs).toHaveLength(1);
    expect(queued.publishJobs?.[0]?.status).toBe('queued');
    expect(queued.publishJobs?.[0]?.url).toBeUndefined();
  }, 90_000);
});
