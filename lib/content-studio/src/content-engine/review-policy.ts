import type {
  AiReviewDecision,
  ContentProjectEnvelope,
  ReviewFinding,
  ReviewScorecard,
  RightsManifest,
} from './types.js';

export const SCORE_CAPS = {
  HOOK: 15,
  PACING: 15,
  STORY: 10,
  GAMEPLAY: 10,
  VIDEO: 10,
  AUDIO: 10,
  CAPTIONS: 10,
  FORMAT: 5,
  BRAND: 5,
  RIGHTS: 5,
  METADATA: 5,
} as const;

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}

export function buildRightsManifest(envelope: ContentProjectEnvelope): RightsManifest {
  const gameplayOwned = envelope.project.mode === 'original' && envelope.rights?.verdict !== 'BLOCKED';
  const dragonMode = envelope.clipCandidates?.some((clip) => clip.dragonMode && clip.dragonMode !== 'NONE');
  const thumbnailPresent = Boolean(envelope.renderJobs[0]?.outputPath);
  const manifest: RightsManifest = {
    GAMEPLAY_RIGHTS: gameplayOwned ? 'OWNED' : envelope.rights?.verdict === 'BLOCKED' ? 'BLOCKED' : 'UNKNOWN',
    MUSIC_RIGHTS: 'UNKNOWN',
    ASSET_RIGHTS: gameplayOwned ? 'OWNED' : 'UNKNOWN',
    DRAGON_ASSETS: dragonMode ? 'UNKNOWN' : 'NONE',
    THUMBNAIL_ASSETS: thumbnailPresent && gameplayOwned ? 'OWNED' : 'UNKNOWN',
    publishReady: false,
  };
  const blocked = Object.entries(manifest).some(
    ([key, value]) => key !== 'publishReady' && (value === 'UNKNOWN' || value === 'BLOCKED'),
  );
  manifest.publishReady = !blocked && envelope.approval?.state === 'approved' && envelope.rights?.verdict !== 'BLOCKED';
  return manifest;
}

export function scoreFromFindings(
  envelope: ContentProjectEnvelope,
  findings: ReviewFinding[],
  rights: RightsManifest,
): ReviewScorecard {
  const deduct = (category: ReviewFinding['category'], weight: number): number => {
    const hits = findings.filter((item) => item.category === category);
    if (hits.some((item) => item.severity === 'CRITICAL')) return 0;
    if (hits.some((item) => item.severity === 'IMPORTANT')) return Math.round(weight * 0.4);
    if (hits.length > 0) return Math.round(weight * 0.75);
    return weight;
  };

  const hookPresent = (envelope.clipCandidates ?? []).some((clip) => clip.hook.trim().length > 0);
  const captionsOk = Boolean(envelope.metadata?.title);
  const score: ReviewScorecard = {
    HOOK: hookPresent ? deduct('HOOK', SCORE_CAPS.HOOK) : 6,
    PACING: deduct('PACING', SCORE_CAPS.PACING),
    STORY: deduct('STORY', SCORE_CAPS.STORY),
    GAMEPLAY: deduct('GAMEPLAY', SCORE_CAPS.GAMEPLAY),
    VIDEO: deduct('VIDEO', SCORE_CAPS.VIDEO),
    AUDIO: deduct('AUDIO', SCORE_CAPS.AUDIO),
    CAPTIONS: captionsOk ? deduct('CAPTIONS', SCORE_CAPS.CAPTIONS) : 5,
    FORMAT: deduct('FORMAT', SCORE_CAPS.FORMAT),
    BRAND: deduct('BRAND', SCORE_CAPS.BRAND),
    RIGHTS: rights.GAMEPLAY_RIGHTS === 'OWNED' && rights.MUSIC_RIGHTS !== 'BLOCKED' ? SCORE_CAPS.RIGHTS : 2,
    METADATA: envelope.metadata?.title ? SCORE_CAPS.METADATA : 2,
    total: 0,
  };
  score.HOOK = clamp(score.HOOK, SCORE_CAPS.HOOK);
  score.PACING = clamp(score.PACING, SCORE_CAPS.PACING);
  score.STORY = clamp(score.STORY, SCORE_CAPS.STORY);
  score.GAMEPLAY = clamp(score.GAMEPLAY, SCORE_CAPS.GAMEPLAY);
  score.VIDEO = clamp(score.VIDEO, SCORE_CAPS.VIDEO);
  score.AUDIO = clamp(score.AUDIO, SCORE_CAPS.AUDIO);
  score.CAPTIONS = clamp(score.CAPTIONS, SCORE_CAPS.CAPTIONS);
  score.FORMAT = clamp(score.FORMAT, SCORE_CAPS.FORMAT);
  score.BRAND = clamp(score.BRAND, SCORE_CAPS.BRAND);
  score.RIGHTS = clamp(score.RIGHTS, SCORE_CAPS.RIGHTS);
  score.METADATA = clamp(score.METADATA, SCORE_CAPS.METADATA);
  score.total =
    score.HOOK +
    score.PACING +
    score.STORY +
    score.GAMEPLAY +
    score.VIDEO +
    score.AUDIO +
    score.CAPTIONS +
    score.FORMAT +
    score.BRAND +
    score.RIGHTS +
    score.METADATA;
  return score;
}

export function decideReview(input: {
  findings: ReviewFinding[];
  rightsBlocked: boolean;
  score: ReviewScorecard;
}): AiReviewDecision {
  if (input.rightsBlocked) return 'BLOCKED';
  const critical = input.findings.filter((item) => item.severity === 'CRITICAL');
  if (critical.some((item) => !item.repairable)) return 'REJECT';
  if (critical.length > 0) return 'REQUEST_CHANGES';
  const important = input.findings.filter((item) => item.severity === 'IMPORTANT');
  if (important.length > 0) return 'REQUEST_CHANGES';
  const minor = input.findings.filter((item) => item.severity === 'MINOR');
  if (minor.length > 0 || input.score.total < 70) return 'APPROVED_WITH_MINOR_FIXES';
  return 'APPROVED';
}
