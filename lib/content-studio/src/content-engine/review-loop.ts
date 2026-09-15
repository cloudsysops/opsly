import fs from 'node:fs';
import path from 'node:path';
import { getContentProjectArtifactsRoot } from './paths.js';
import { assertReviewerCannotPublish, reviewRenderedArtifact } from './review-agent.js';
import { buildRightsManifest } from './review-policy.js';
import { repairFromFindings } from './review-repair.js';
import { saveProjectEnvelope, setProjectApproval } from './storage.js';
import type { ArtifactVersion, ContentProjectEnvelope, IndependentReviewState } from './types.js';
import { MAX_REVIEW_ROUNDS, reviewAgentIds } from './types.js';

function registerVersionOne(envelope: ContentProjectEnvelope, videoPath: string): ContentProjectEnvelope {
  const version: ArtifactVersion = {
    id: 'video-v1',
    label: 'video-v1',
    path: videoPath,
    parentVersion: null,
    findingsAddressed: [],
    reviewScore: null,
    createdAt: new Date().toISOString(),
    createdBy: reviewAgentIds.creator,
  };
  const state: IndependentReviewState = {
    state: 'rendered',
    round: 0,
    maxRounds: MAX_REVIEW_ROUNDS,
    findings: [],
    versions: [version],
    reviews: [],
    currentVersionId: version.id,
  };
  return { ...envelope, aiReview: state };
}

function persistReviewCopy(envelope: ContentProjectEnvelope, baseDir: string): void {
  const artifacts = getContentProjectArtifactsRoot(envelope.project.id, baseDir);
  const versionsDir = path.join(artifacts, 'versions');
  fs.mkdirSync(versionsDir, { recursive: true });
  const current = envelope.aiReview?.versions.find((item) => item.id === envelope.aiReview?.currentVersionId);
  if (current && fs.existsSync(current.path) && path.basename(current.path) !== 'final.mp4') {
    const frozen = path.join(versionsDir, `${current.id}.mp4`);
    if (!fs.existsSync(frozen) && current.path !== frozen) {
      fs.copyFileSync(current.path, frozen);
    }
  }
  fs.writeFileSync(path.join(artifacts, 'review.json'), `${JSON.stringify(envelope.aiReview, null, 2)}\n`);
}

export async function runIndependentReviewLoop(
  envelope: ContentProjectEnvelope,
  baseDir = process.cwd(),
): Promise<ContentProjectEnvelope> {
  assertReviewerCannotPublish();
  const firstOutput = envelope.renderJobs[0]?.outputPath;
  if (!firstOutput || !fs.existsSync(firstOutput)) {
    throw new Error('REVIEW_BLOCKED: no rendered artifact');
  }

  let next = envelope.aiReview ? envelope : registerVersionOne(envelope, firstOutput);
  persistReviewCopy(next, baseDir);

  while (true) {
    const current = next.aiReview?.versions.find((item) => item.id === next.aiReview?.currentVersionId);
    if (!current) throw new Error('REVIEW_BLOCKED: missing current version');
    next = {
      ...next,
      aiReview: next.aiReview ? { ...next.aiReview, state: 'ai_review' } : next.aiReview,
    };
    const record = await reviewRenderedArtifact(next, {
      videoPath: current.path,
      transcript: next.transcript?.text,
      captions: next.clipCandidates?.[0]?.hook,
      title: next.metadata?.title ?? next.project.title,
      workDir: getContentProjectArtifactsRoot(next.project.id, baseDir),
    });
    const reviews = [...(next.aiReview?.reviews ?? []), record];
    const versions = (next.aiReview?.versions ?? []).map((item) =>
      item.id === current.id ? { ...item, reviewScore: record.score.total } : item,
    );
    next = {
      ...next,
      aiReview: {
        state: 'ai_review',
        round: record.round,
        maxRounds: MAX_REVIEW_ROUNDS,
        decision: record.decision,
        score: record.score,
        findings: record.findings,
        versions,
        reviews,
        currentVersionId: current.id,
        lastReviewedAt: record.createdAt,
      },
      rightsManifest: buildRightsManifest(next),
    };

    if (record.decision === 'BLOCKED') {
      next = { ...next, aiReview: { ...next.aiReview!, state: 'blocked' } };
      break;
    }
    if (record.decision === 'REJECT') {
      next = { ...next, aiReview: { ...next.aiReview!, state: 'rejected' } };
      break;
    }
    if (record.decision === 'APPROVED' || record.decision === 'APPROVED_WITH_MINOR_FIXES') {
      next = {
        ...next,
        aiReview: { ...next.aiReview!, state: 'ai_approved' },
      };
      break;
    }
    if (record.round >= MAX_REVIEW_ROUNDS) {
      next = { ...next, aiReview: { ...next.aiReview!, state: 'human_review_required' } };
      break;
    }
    next = {
      ...next,
      aiReview: { ...next.aiReview!, state: 'changes_requested' },
    };
    next = await repairFromFindings(next, record.findings, baseDir);
  }

  const aiState = next.aiReview?.state;
  const readyForHuman = aiState === 'ai_approved' || aiState === 'human_review_required' || aiState === 'ready_for_human_approval';
  if (readyForHuman && next.rights?.verdict !== 'BLOCKED') {
    next = setProjectApproval(next, {
      state: 'ready_for_review',
      reviewNotes: `AI ${next.aiReview?.decision ?? 'review'} r${next.aiReview?.round ?? 0}; score ${next.aiReview?.score?.total ?? 0}`,
    });
    next = {
      ...next,
      aiReview: next.aiReview
        ? {
            ...next.aiReview,
            state: next.aiReview.state === 'human_review_required' ? 'human_review_required' : 'ready_for_human_approval',
          }
        : next.aiReview,
    };
  }

  persistReviewCopy(next, baseDir);
  await saveProjectEnvelope(next, baseDir);
  return next;
}
