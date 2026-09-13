export const MOMENT_SCORE_VERSION = 'moment-score-v1' as const;

export const MOMENT_WEIGHTS = Object.freeze({
  eventRarity: 0.3,
  communityParticipation: 0.2,
  outcomeUnexpectedness: 0.2,
  playerPerformance: 0.15,
  narrativeCoherence: 0.15,
});

export type MomentSignalKey = keyof typeof MOMENT_WEIGHTS;

export interface MomentSignals {
  eventRarity: number;
  communityParticipation: number;
  outcomeUnexpectedness: number;
  playerPerformance: number;
  narrativeCoherence: number;
}

export type MomentBand = 'ignore' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface MomentReason {
  signal: MomentSignalKey;
  value: number;
  weight: number;
  contribution: number;
}

export interface MomentScoreResult {
  version: typeof MOMENT_SCORE_VERSION;
  score: number;
  band: MomentBand;
  shouldGenerate: boolean;
  requiresHumanConfirmation: boolean;
  autoPublish: false;
  reasons: MomentReason[];
}

export type MomentDecision = 'KEEP' | 'DOWNGRADE' | 'REJECT';

export interface MomentDecisionResult {
  decision: MomentDecision;
  status: 'kept' | 'downgraded' | 'rejected';
  finalBand: Exclude<MomentBand, 'ignore'> | null;
  publishApproved: false;
}

function round(value: number, digits = 6): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function assertNormalizedSignal(name: MomentSignalKey, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${name} must be a finite number between 0 and 1`);
  }
}

export function bandForMomentScore(score: number): MomentBand {
  if (!Number.isFinite(score) || score < 0 || score > 1) {
    throw new Error('moment score must be between 0 and 1');
  }
  if (score < 0.4) return 'ignore';
  if (score < 0.6) return 'rare';
  if (score < 0.8) return 'epic';
  if (score < 0.95) return 'legendary';
  return 'mythic';
}

export function scoreMoment(signals: MomentSignals): MomentScoreResult {
  const reasons = (Object.keys(MOMENT_WEIGHTS) as MomentSignalKey[]).map(signal => {
    const value = signals[signal];
    assertNormalizedSignal(signal, value);
    const weight = MOMENT_WEIGHTS[signal];
    return {
      signal,
      value,
      weight,
      contribution: round(value * weight),
    };
  });

  const score = round(reasons.reduce((sum, reason) => sum + reason.contribution, 0));
  const band = bandForMomentScore(score);

  return {
    version: MOMENT_SCORE_VERSION,
    score,
    band,
    shouldGenerate: band !== 'ignore',
    requiresHumanConfirmation: band === 'mythic',
    autoPublish: false,
    reasons: [...reasons].sort((a, b) => b.contribution - a.contribution),
  };
}

const DOWNGRADE_MAP: Record<Exclude<MomentBand, 'ignore'>, Exclude<MomentBand, 'ignore'>> = {
  rare: 'rare',
  epic: 'rare',
  legendary: 'epic',
  mythic: 'legendary',
};

export function applyMomentDecision(
  candidate: MomentScoreResult,
  decision: MomentDecision,
): MomentDecisionResult {
  if (!candidate.shouldGenerate || candidate.band === 'ignore') {
    throw new Error('cannot decide a Moment that is below the generation threshold');
  }

  if (decision === 'REJECT') {
    return {
      decision,
      status: 'rejected',
      finalBand: null,
      publishApproved: false,
    };
  }

  if (decision === 'DOWNGRADE') {
    return {
      decision,
      status: 'downgraded',
      finalBand: DOWNGRADE_MAP[candidate.band],
      publishApproved: false,
    };
  }

  return {
    decision,
    status: 'kept',
    finalBand: candidate.band,
    publishApproved: false,
  };
}
