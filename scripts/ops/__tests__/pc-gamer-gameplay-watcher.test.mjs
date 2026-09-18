import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  isFileStable,
  listVideoFiles,
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
      cmd: 'prepare-session',
      args: ['--tenant', 'icso-gaming-tbd', '--file', '/videos/instant-replay/session-01.mp4'],
    });
  });

  it('routes NVIDIA Highlights to automatic draft preparation', () => {
    expect(
      pickCommand('/videos/highlights/clip-07.mp4', {
        instantReplayDir: '/videos/instant-replay',
        highlightsDir: '/videos/highlights',
      }),
    ).toEqual({
      cmd: 'prepare-highlight',
      args: ['--tenant', 'icso-gaming-tbd', '--file', '/videos/highlights/clip-07.mp4'],
    });
  });

  it('routes OBS recordings to automatic draft preparation', () => {
    expect(
      pickCommand('/videos/obs/valorant-clip.mp4', {
        instantReplayDir: '/videos/instant-replay',
        highlightsDir: '/videos/highlights',
        obsRecordingsDir: '/videos/obs',
      }),
    ).toEqual({
      cmd: 'prepare-highlight',
      args: ['--tenant', 'icso-gaming-tbd', '--file', '/videos/obs/valorant-clip.mp4'],
    });
  });

  it('routes an instant-replay file when highlightsDir is not configured', () => {
    expect(
      pickCommand('/videos/nvidia/Valorant/clip.DVR.mp4', {
        instantReplayDir: '/videos/nvidia',
      }),
    ).toEqual({
      cmd: 'prepare-session',
      args: ['--tenant', 'icso-gaming-tbd', '--file', '/videos/nvidia/Valorant/clip.DVR.mp4'],
    });
  });

  it('finds recordings one level deep, matching NVIDIA ShadowPlay per-game subfolders', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'nvidia-capture-root-'));
    mkdirSync(path.join(root, 'Valorant'));
    mkdirSync(path.join(root, 'Desktop'));
    writeFileSync(path.join(root, 'Valorant', 'clip-01.DVR.mp4'), 'x');
    writeFileSync(path.join(root, 'Valorant', 'clip-02.mp4'), 'x');
    writeFileSync(path.join(root, 'Desktop', 'clip-03.mp4'), 'x');
    writeFileSync(path.join(root, 'notes.txt'), 'not a video');

    const found = listVideoFiles(root).sort();
    expect(found).toEqual(
      [
        path.join(root, 'Desktop', 'clip-03.mp4'),
        path.join(root, 'Valorant', 'clip-01.DVR.mp4'),
        path.join(root, 'Valorant', 'clip-02.mp4'),
      ].sort(),
    );
  });
});
