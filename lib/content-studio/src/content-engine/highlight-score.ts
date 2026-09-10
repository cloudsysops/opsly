import type {
  ClipCandidate,
  ContentFormat,
  DragonCyberMode,
  HighlightScoreBreakdown,
} from './types.js';

export const MIN_PRIMARY_SCORE = 35;
export const MAX_PRIMARY_CANDIDATES = 5;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function durationEntertainment(durationSec: number): number {
  if (durationSec >= 8 && durationSec <= 25) return 82;
  if (durationSec >= 5 && durationSec < 8) return 64;
  if (durationSec > 25 && durationSec <= 45) return 58;
  return 38;
}

export function scoreGameplayCandidate(clip: ClipCandidate): ClipCandidate {
  const reaction =
    clip.category === 'nvidia_highlight' ? 86 : clip.category === 'audio_peak' ? 74 : 48;
  const hook = clip.hook.trim().length >= 8 ? 70 : 42;
  const clarity = clip.duration >= 4 ? 68 : 36;
  const visual = 50;
  const story = clip.duration >= 10 ? 62 : 44;
  const tech = 40;
  const uniqueness = 60;
  const duplication = 20;
  const rightsRisk = clip.category === 'commentary' ? 55 : 22;
  const entertainment = durationEntertainment(clip.duration);
  const breakdown: HighlightScoreBreakdown = {
    ENTERTAINMENT: entertainment,
    REACTION_STRENGTH: reaction,
    HOOK: hook,
    CLARITY: clarity,
    VISUAL_QUALITY: visual,
    STORY_VALUE: story,
    TECH_CONNECTION: tech,
    UNIQUENESS: uniqueness,
    DUPLICATION: duplication,
    RIGHTS_RISK: rightsRisk,
  };
  const score = clampScore(
    entertainment * 0.22 +
      reaction * 0.2 +
      hook * 0.12 +
      clarity * 0.1 +
      visual * 0.08 +
      story * 0.1 +
      uniqueness * 0.08 +
      (100 - rightsRisk) * 0.1,
  );
  const recommendedFormats: ContentFormat[] = ['youtube_short', 'instagram_reel', 'tiktok'];
  const dragonMode: DragonCyberMode = 'NONE';
  const reasons = [...clip.reasons, `heuristic_score_${score}`];
  return {
    ...clip,
    score,
    reasons,
    scoreBreakdown: breakdown,
    recommendedFormats,
    dragonMode,
    hook: clip.hook.trim() || 'Gameplay highlight',
  };
}

export function selectPrimaryCandidates(
  clips: ClipCandidate[],
  options?: { minScore?: number; maxPrimary?: number },
): { primary: ClipCandidate[]; overflow: ClipCandidate[] } {
  const minScore = options?.minScore ?? MIN_PRIMARY_SCORE;
  const maxPrimary = options?.maxPrimary ?? MAX_PRIMARY_CANDIDATES;
  const ranked = clips
    .map((clip) => scoreGameplayCandidate(clip))
    .filter((clip) => clip.score >= minScore)
    .sort((left, right) => right.score - left.score);
  return {
    primary: ranked.slice(0, maxPrimary),
    overflow: ranked.slice(maxPrimary),
  };
}
