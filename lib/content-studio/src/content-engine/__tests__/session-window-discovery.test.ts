import { describe, expect, it } from 'vitest';
import {
  SESSION_WINDOW_TIER_BASE_SCORE,
  discoverSessionWindowCandidates,
  discoverSessionWindowCandidatesForSource,
} from '../session-window-discovery.js';
import { scoreGameplayCandidate } from '../highlight-score.js';

describe('discoverSessionWindowCandidatesForSource', () => {
  it('splits a source into dense, sequential windows covering the whole duration', () => {
    const clips = discoverSessionWindowCandidatesForSource(
      { sourceVideo: 'match.mp4', durationSec: 50, captureTier: 'match_4k60' },
      { windowSec: 20 }
    );
    expect(clips).toHaveLength(3);
    expect(clips[0].start).toBe(0);
    expect(clips[0].end).toBe(20);
    expect(clips[1].start).toBe(20);
    expect(clips[1].end).toBe(40);
    expect(clips[2].start).toBe(40);
    expect(clips[2].end).toBe(50);
    expect(clips[2].duration).toBe(10);
  });

  it('never claims a confirmed elimination and always describes itself as an unverified activity window', () => {
    const clips = discoverSessionWindowCandidatesForSource({
      sourceVideo: 'match.mp4',
      durationSec: 30,
      captureTier: 'match_4k60',
    });
    for (const clip of clips) {
      expect(clip.confirmedElimination).toBe(false);
      expect(clip.description).toMatch(/activity window only; eliminations unverified/);
    }
  });

  it('cycles through the narrative-beat tag taxonomy chronologically', () => {
    const clips = discoverSessionWindowCandidatesForSource(
      { sourceVideo: 'match.mp4', durationSec: 60, captureTier: 'match_4k60' },
      { windowSec: 20 }
    );
    expect(clips.map((clip) => clip.reasons[2])).toEqual(['hook', 'open', 'push']);
  });

  it('scores by capture tier, not by any detected intensity', () => {
    const match = discoverSessionWindowCandidatesForSource({
      sourceVideo: 'match.mp4',
      durationSec: 20,
      captureTier: 'match_4k60',
    });
    const action = discoverSessionWindowCandidatesForSource({
      sourceVideo: 'gopro.mp4',
      durationSec: 20,
      captureTier: 'action_cam',
    });
    const iphone = discoverSessionWindowCandidatesForSource({
      sourceVideo: 'phone.mp4',
      durationSec: 20,
      captureTier: 'iphone',
    });
    expect(match[0].score).toBe(SESSION_WINDOW_TIER_BASE_SCORE.match_4k60);
    expect(action[0].score).toBe(SESSION_WINDOW_TIER_BASE_SCORE.action_cam);
    expect(iphone[0].score).toBe(SESSION_WINDOW_TIER_BASE_SCORE.iphone);
    expect(match[0].score).toBeGreaterThan(action[0].score);
    expect(action[0].score).toBeGreaterThan(iphone[0].score);
  });

  it('respects an explicit per-source qualityScore override over the tier default', () => {
    const clips = discoverSessionWindowCandidatesForSource({
      sourceVideo: 'gopro-b.mp4',
      durationSec: 20,
      captureTier: 'action_cam',
      qualityScore: 65,
    });
    expect(clips[0].score).toBe(65);
  });

  it('includes session_window and the capture tier in reasons for traceability', () => {
    const clips = discoverSessionWindowCandidatesForSource({
      sourceVideo: 'match.mp4',
      durationSec: 20,
      captureTier: 'match_4k60',
    });
    expect(clips[0].reasons).toEqual(expect.arrayContaining(['session_window', 'match_4k60']));
  });

  it('drops a trailing remainder shorter than minSec', () => {
    const clips = discoverSessionWindowCandidatesForSource(
      { sourceVideo: 'match.mp4', durationSec: 21, captureTier: 'match_4k60' },
      { windowSec: 20, minSec: 3 }
    );
    expect(clips).toHaveLength(1);
    expect(clips[0].end).toBe(20);
  });

  it('throws SESSION_WINDOW_DISCOVERY_FAILED for a non-positive duration', () => {
    expect(() =>
      discoverSessionWindowCandidatesForSource({ sourceVideo: 'bad.mp4', durationSec: 0, captureTier: 'iphone' })
    ).toThrow(/SESSION_WINDOW_DISCOVERY_FAILED/);
  });
});

describe('discoverSessionWindowCandidates', () => {
  it('ranks windows across multiple sources by score and caps at the limit', () => {
    const clips = discoverSessionWindowCandidates(
      [
        { sourceVideo: 'match.mp4', durationSec: 40, captureTier: 'match_4k60' },
        { sourceVideo: 'phone.mp4', durationSec: 40, captureTier: 'iphone' },
      ],
      { windowSec: 20, limit: 3 }
    );
    expect(clips).toHaveLength(3);
    expect(clips[0].captureTier).toBe('match_4k60');
    expect(clips.every((clip, index) => index === 0 || clip.score <= clips[index - 1].score)).toBe(true);
  });

  it('throws SESSION_WINDOW_DISCOVERY_FAILED when no sources are given', () => {
    expect(() => discoverSessionWindowCandidates([])).toThrow(/SESSION_WINDOW_DISCOVERY_FAILED/);
  });
});

describe('scoreGameplayCandidate integration with session-window candidates', () => {
  it('gives a match_4k60 session-window candidate a higher reaction-driven score than an iphone one', () => {
    const [matchClip] = discoverSessionWindowCandidatesForSource({
      sourceVideo: 'match.mp4',
      durationSec: 20,
      captureTier: 'match_4k60',
    });
    const [iphoneClip] = discoverSessionWindowCandidatesForSource({
      sourceVideo: 'phone.mp4',
      durationSec: 20,
      captureTier: 'iphone',
    });
    const scoredMatch = scoreGameplayCandidate(matchClip);
    const scoredIphone = scoreGameplayCandidate(iphoneClip);
    expect(scoredMatch.score).toBeGreaterThan(scoredIphone.score);
    expect(scoredMatch.scoreBreakdown?.REACTION_STRENGTH).toBeGreaterThan(
      scoredIphone.scoreBreakdown?.REACTION_STRENGTH ?? 0
    );
  });

  it('preserves description and confirmedElimination through scoring', () => {
    const [clip] = discoverSessionWindowCandidatesForSource({
      sourceVideo: 'match.mp4',
      durationSec: 20,
      captureTier: 'match_4k60',
    });
    const scored = scoreGameplayCandidate(clip);
    expect(scored.confirmedElimination).toBe(false);
    expect(scored.description).toMatch(/eliminations unverified/);
  });
});
