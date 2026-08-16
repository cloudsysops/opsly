import type { Scene } from '../domain/types.js';

function formatTimestamp(ms: number): string {
  const totalMs = Math.max(0, Math.round(ms));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const millis = totalMs % 1000;
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}

/**
 * Builds an SRT file's contents from scenes in order. Scenes without a
 * caption are skipped (no empty subtitle cue), but still advance the
 * timeline so later captions stay in sync.
 */
export function buildSrt(scenes: Scene[]): string {
  const ordered = [...scenes].sort((a, b) => a.order - b.order);
  let cursorMs = 0;
  let cueNumber = 1;
  const blocks: string[] = [];

  for (const scene of ordered) {
    if (scene.caption && scene.caption.trim().length > 0) {
      const startMs = cursorMs;
      const endMs = cursorMs + scene.durationMs;
      blocks.push(
        [
          String(cueNumber),
          `${formatTimestamp(startMs)} --> ${formatTimestamp(endMs)}`,
          scene.caption.trim(),
          '',
        ].join('\n')
      );
      cueNumber += 1;
    }
    cursorMs += scene.durationMs;
  }

  return blocks.join('\n');
}
