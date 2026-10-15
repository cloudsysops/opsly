import type { ClipCandidate as ClipCandidateType, SessionWindowCaptureTier, SessionWindowTag } from './types.js';
import { sessionWindowTagValues } from './types.js';

/**
 * Alternate highlight.detect strategy (same capability, alternate owner) for
 * footage where there is no reliable audio-peak signal to key off of — e.g.
 * airsoft/POV gameplay, where gunfire is constant/ambient rather than a
 * discrete cue the way a kill-feed chime or voice line would be.
 *
 * Supersedes the ad-hoc `airsoft-edit-pipeline.cjs` PC-gamer script's method:
 * dense, chronological "session windows" across the source recording, scored
 * by capture-device/resolution tier rather than by detected action
 * intensity, and NEVER claiming a verified elimination happened. See
 * docs/00-architecture/CONTENT-PIPELINE-CANONICAL.md for the full pipeline
 * this feeds into (highlight.score -> clip.extract -> vertical.reframe ->
 * captions -> rights -> qa -> approval -> publish).
 */

/** Base reaction/quality score per capture tier, mirrors the ad-hoc script's device ranking. */
export const SESSION_WINDOW_TIER_BASE_SCORE: Record<SessionWindowCaptureTier, number> = {
  match_4k60: 90,
  action_cam: 70,
  iphone: 55,
};

export interface SessionWindowSourceInput {
  /** Identifier or path for the source video this batch of windows comes from. */
  sourceVideo: string;
  /** Total duration of the source video in seconds (e.g. from probeMedia). */
  durationSec: number;
  /** Source-capture-quality tier used to seed each window's score. */
  captureTier: SessionWindowCaptureTier;
  /**
   * Optional explicit quality override (0-100) for this specific source,
   * when two sources share a tier but were judged differently (the ad-hoc
   * script scored one action-cam clip 75 and others 65). Falls back to
   * SESSION_WINDOW_TIER_BASE_SCORE[captureTier] when omitted.
   */
  qualityScore?: number;
  /** Marketing/content category label, e.g. "Best Airsoft Moments". */
  category?: string;
  /** Narrative-beat tag sequence to cycle through chronologically. Defaults to the full taxonomy in order. */
  tags?: SessionWindowTag[];
}

export interface SessionWindowDiscoveryOptions {
  /** Length of each session window in seconds. Default 20. */
  windowSec?: number;
  /** Minimum window length kept after bounding. Default 3. */
  minSec?: number;
  /** Maximum candidates returned across all sources, highest score first. Default 5. */
  limit?: number;
}

const DEFAULT_CATEGORY = 'Gameplay Session';
const DEFAULT_WINDOW_SEC = 20;
const DEFAULT_MIN_SEC = 3;
const DEFAULT_LIMIT = 5;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function tagFor(tags: SessionWindowTag[], index: number): SessionWindowTag {
  return tags[index % tags.length];
}

/**
 * Splits one source video into dense, sequential, non-overlapping session
 * windows and scores each by its source's capture tier. No audio or vision
 * signal is consulted — this is deliberately a "no invented kills" method:
 * every candidate's description and confirmedElimination flag say plainly
 * that this is an activity window, not a verified event.
 */
export function discoverSessionWindowCandidatesForSource(
  source: SessionWindowSourceInput,
  options?: SessionWindowDiscoveryOptions,
): ClipCandidateType[] {
  if (!(source.durationSec > 0)) {
    throw new Error(`SESSION_WINDOW_DISCOVERY_FAILED: non-positive duration for ${source.sourceVideo}`);
  }
  const windowSec = options?.windowSec ?? DEFAULT_WINDOW_SEC;
  const minSec = options?.minSec ?? DEFAULT_MIN_SEC;
  if (windowSec <= 0) {
    throw new Error('SESSION_WINDOW_DISCOVERY_FAILED: windowSec must be > 0');
  }
  const tags = source.tags && source.tags.length > 0 ? source.tags : [...sessionWindowTagValues];
  const category = source.category ?? DEFAULT_CATEGORY;
  const baseScore = clampScore(source.qualityScore ?? SESSION_WINDOW_TIER_BASE_SCORE[source.captureTier]);

  const windows: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  let index = 0;
  while (cursor < source.durationSec) {
    const end = Math.min(cursor + windowSec, source.durationSec);
    if (end - cursor >= minSec) {
      windows.push({ start: cursor, end });
    }
    cursor = end;
    index += 1;
    if (index > 10_000) break; // defensive: never loop forever on bad input
  }
  if (windows.length === 0) {
    throw new Error(`SESSION_WINDOW_DISCOVERY_EMPTY: ${source.sourceVideo} produced no windows >= ${minSec}s`);
  }

  return windows.map((window, windowIndex) => {
    const tag = tagFor(tags, windowIndex);
    const duration = Number((window.end - window.start).toFixed(2));
    return {
      id: `session-window-${String(windowIndex + 1).padStart(3, '0')}`,
      start: window.start,
      end: window.end,
      duration,
      transcript: '',
      hook: 'Gameplay highlight',
      category,
      score: baseScore,
      reasons: ['session_window', source.captureTier, tag],
      description: `POV segment (${tag}) — activity window only; eliminations unverified`,
      confirmedElimination: false,
      captureTier: source.captureTier,
    } satisfies ClipCandidateType;
  });
}

/**
 * Multi-source entry point: runs discoverSessionWindowCandidatesForSource
 * across one or more sources (a batch of raw recordings processed together,
 * as the ad-hoc script did) and returns the best candidates overall, ranked
 * by pre-score. Each source still becomes its own set of windows; this does
 * not merge sources into one timeline.
 */
export function discoverSessionWindowCandidates(
  sources: SessionWindowSourceInput[],
  options?: SessionWindowDiscoveryOptions,
): ClipCandidateType[] {
  if (sources.length === 0) {
    throw new Error('SESSION_WINDOW_DISCOVERY_FAILED: no sources provided');
  }
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const all = sources.flatMap((source) => discoverSessionWindowCandidatesForSource(source, options));
  return [...all].sort((a, b) => b.score - a.score).slice(0, limit);
}
