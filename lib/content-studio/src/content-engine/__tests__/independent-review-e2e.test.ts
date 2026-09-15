import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDistributionPackages } from '../distribution.js';
import { ffmpegAvailable, generateLeadingBlackGameplayFixture } from '../ffmpeg.js';
import { enqueueApprovedPublishJobs } from '../publishing.js';
import { runIndependentReviewLoop } from '../review-loop.js';
import { createProjectEnvelope, setProjectApproval } from '../storage.js';
import { reviewAgentIds } from '../types.js';

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

describe.skipIf(!ffmpegAvailable())('independent AI review loop', () => {
  it('requests a real change on v1, repairs to v2, then AI-approves for Cristian', async () => {
    const baseDir = path.join(os.tmpdir(), `ai-review-${Date.now()}`);
    writeGamingChannel(baseDir);
    const v1 = path.join(baseDir, 'render-v1.mp4');
    await generateLeadingBlackGameplayFixture(v1);

    let envelope = await createProjectEnvelope(
      {
        tenantId: 'icso-gaming-tbd',
        channel: 'icso-gaming-tbd',
        series: 'mauro',
        title: 'Mauro review clip',
        goal: 'engagement',
        audience: 'youth',
        format: 'youtube_short',
        mode: 'original',
      },
      baseDir,
    );
    envelope = {
      ...envelope,
      metadata: {
        title: 'Mauro review clip',
        description: 'Owned gameplay short',
        tags: ['gameplay'],
        privacyStatus: 'unlisted',
      },
      clipCandidates: [
        {
          id: 'clip-1',
          start: 0,
          end: 10,
          duration: 10,
          transcript: '',
          hook: 'Gameplay highlight',
          category: 'peak',
          score: 40,
          reasons: ['fixture'],
          dragonMode: 'NONE',
        },
      ],
      renderJobs: [
        {
          id: 'render-v1',
          projectId: envelope.project.id,
          status: 'completed',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          outputPath: v1,
          logs: [v1],
        },
      ],
      rights: { verdict: 'LOW_RISK', reasons: ['owned fixture'], blockedCodes: [] },
    };

    const reviewed = await runIndependentReviewLoop(envelope, baseDir);
    const first = reviewed.aiReview?.reviews[0];
    const last = reviewed.aiReview?.reviews.at(-1);

    expect(first?.reviewerAgent).toBe(reviewAgentIds.reviewer);
    expect(first?.creatorAgent).toBe(reviewAgentIds.creator);
    expect(first?.reviewerAgent).not.toBe(first?.creatorAgent);
    expect(first?.decision).toBe('REQUEST_CHANGES');
    expect(first?.findings.some((item) => item.timecode_end > 0 && item.repairable)).toBe(true);

    expect(reviewed.aiReview?.versions.map((item) => item.id)).toContain('video-v1');
    expect(reviewed.aiReview?.versions.map((item) => item.id)).toContain('video-v2');
    const v2 = reviewed.aiReview?.versions.find((item) => item.id === 'video-v2');
    expect(v2?.parentVersion).toBe('video-v1');
    expect(v2 && existsSync(v2.path)).toBe(true);
    expect(v2?.path).not.toBe(v1);
    expect(existsSync(v1)).toBe(true);

    expect(last?.decision).toMatch(/^APPROVED/);
    expect(reviewed.aiReview?.state).toBe('ready_for_human_approval');
    expect(reviewed.approval?.state).toBe('ready_for_review');
    expect(reviewed.rightsManifest?.MUSIC_RIGHTS).toBe('UNKNOWN');
    expect(reviewed.rightsManifest?.publishReady).toBe(false);

    const approved = setProjectApproval(reviewed, {
      state: 'approved',
      approvedBy: 'cristian',
      approvedAt: new Date().toISOString(),
    });
    const packages = buildDistributionPackages(approved, baseDir);
    expect(packages.map((item) => item.platform)).toEqual(['youtube', 'tiktok', 'instagram', 'facebook', 'x']);
    expect(new Set(packages.map((item) => item.videoPath)).size).toBe(1);
    const queued = enqueueApprovedPublishJobs(approved, ['youtube', 'tiktok', 'instagram', 'facebook', 'x']);
    expect(queued.publishJobs).toHaveLength(5);
    expect(queued.publishJobs?.every((job) => job.status === 'queued' && !job.url)).toBe(true);
  }, 120_000);
});
