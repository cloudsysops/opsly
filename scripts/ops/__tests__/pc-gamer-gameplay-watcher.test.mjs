import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  isFileStable,
  loadDedupState,
  pickCommand,
  saveDedupState,
} from '../pc-gamer-gameplay-watcher.mjs';

describe('PC-gamer gameplay watcher', () => {
  it('requires a non-empty unchanged file for stability', () => {
    expect(isFileStable({ size: 1024, mtimeMs: 1 }, { size: 1024, mtimeMs: 2 })).toBe(true);
    expect(isFileStable({ size: 1024, mtimeMs: 1 }, { size: 2048, mtimeMs: 2 })).toBe(false);
    expect(isFileStable({ size: 0, mtimeMs: 1 }, { size: 0, mtimeMs: 2 })).toBe(false);
  });

  it('round-trips and deduplicates processed paths', () => {
    const statePath = path.join(mkdtempSync(path.join(os.tmpdir(), 'watcher-state-')), 'state.json');
    saveDedupState(statePath, ['/b.mp4', '/a.mp4', '/a.mp4']);
    expect(loadDedupState(statePath)).toEqual(['/a.mp4', '/b.mp4']);
  });

  it('routes Instant Replay to audio discovery', () => {
    const result = pickCommand('/videos/instant-replay/session-01.mp4', {
      instantReplayDir: '/videos/instant-replay',
      highlightsDir: '/videos/highlights',
    });
    expect(result).toEqual({
      cmd: 'ingest',
      args: ['--tenant', 'icso-gaming-tbd', '--mode', 'original', '--file', '/videos/instant-replay/session-01.mp4'],
    });
  });

  it('routes NVIDIA Highlights to the pre-cut path', () => {
    expect(
      pickCommand('/videos/highlights/clip-07.mp4', {
        instantReplayDir: '/videos/instant-replay',
        highlightsDir: '/videos/highlights',
      }).cmd,
    ).toBe('ingest-highlight');
  });
});
