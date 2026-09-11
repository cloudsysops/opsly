import path from 'node:path';
import { runDeterministicMediaQa } from './media-qa.js';
import { runOptionalNarrativeReview } from './review-narrative.js';
import { buildRightsManifest, decideReview, scoreFromFindings } from './review-policy.js';
import { runOptionalVisionReview } from './review-vision.js';
import type {
  ContentProjectEnvelope,
  IndependentReviewRecord,
  ReviewFinding,
} from './types.js';
import { reviewAgentIds } from './types.js';

export interface ReviewInputs {
  videoPath: string;
  transcript?: string;
  captions?: string;
  thumbnailPath?: string;
  title?: string;
  workDir?: string;
}

/**
 * Independent reviewer. Does not publish. Does not mutate the artifact.
 * Visual/narrative models are optional adapters; deterministic FFmpeg QA is required.
 * Creator agent id is recorded separately — reviewer never receives creator chain-of-thought.
 */
export async function reviewRenderedArtifact(
  envelope: ContentProjectEnvelope,
  inputs: ReviewInputs,
): Promise<IndependentReviewRecord> {
  const media = await runDeterministicMediaQa(inputs.videoPath);
  const findings: ReviewFinding[] = [...media.findings];
  const duration = media.probe?.duration ?? 0;
  const workDir = inputs.workDir ?? path.dirname(inputs.videoPath);

  if (!inputs.title || inputs.title.trim().length < 4) {
    findings.push({
      finding_id: 'meta-title',
      severity: 'MINOR',
      timecode_start: 0,
      timecode_end: duration,
      category: 'METADATA',
      issue: 'Title is missing or too short',
      recommended_fix: 'Write a title that matches the rendered gameplay, no invented events',
      evidence: inputs.title ?? '',
      repairable: true,
    });
  }

  if (inputs.captions && inputs.captions.toLowerCase().includes('invent')) {
    findings.push({
      finding_id: 'story-invented',
      severity: 'IMPORTANT',
      timecode_start: 0,
      timecode_end: duration,
      category: 'STORY',
      issue: 'Captions invent events not present in gameplay',
      recommended_fix: 'Rewrite captions from the transcript/hook only',
      evidence: 'caption policy',
      repairable: true,
    });
  }

  const [vision, narrative] = await Promise.all([
    runOptionalVisionReview({ videoPath: inputs.videoPath, durationSec: duration, workDir }),
    runOptionalNarrativeReview({
      title: inputs.title,
      captions: inputs.captions,
      transcript: inputs.transcript,
      durationSec: duration,
    }),
  ]);
  findings.push(...vision.findings, ...narrative.findings);

  const rights = envelope.rightsManifest ?? buildRightsManifest(envelope);
  const rightsBlocked = envelope.rights?.verdict === 'BLOCKED' || rights.GAMEPLAY_RIGHTS === 'BLOCKED';
  const score = scoreFromFindings(envelope, findings, rights);
  const decision = decideReview({ findings, rightsBlocked, score });
  const round = (envelope.aiReview?.round ?? 0) + 1;

  return {
    round,
    reviewerAgent: reviewAgentIds.reviewer,
    creatorAgent: reviewAgentIds.creator,
    decision,
    score,
    findings,
    versionId: envelope.aiReview?.currentVersionId ?? 'video-v1',
    createdAt: new Date().toISOString(),
    modelHints: {
      visual: vision.used ? vision.model : 'ffmpeg-deterministic',
      narrative: narrative.used ? narrative.model : 'metadata-deterministic',
    },
  };
}

export function assertReviewerCannotPublish(): void {
  if (process.env.OPSLY_CONTENT_AUTO_PUBLISH === 'true') {
    throw new Error('BLOCKED_AUTO_PUBLISH: reviewer cannot publish');
  }
}
