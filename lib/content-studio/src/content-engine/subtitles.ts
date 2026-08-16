import type { ContentScene } from './types.js';

export interface SubtitleCue {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

export function formatSrtTimestamp(totalMs: number): string {
  const ms = Math.max(0, Math.floor(totalMs));
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

export function buildSubtitleCuesFromScenes(scenes: ContentScene[]): SubtitleCue[] {
  let cursor = 0;
  return [...scenes]
    .sort((a, b) => a.order - b.order)
    .map((scene, index) => {
      const startMs = cursor;
      const endMs = cursor + scene.durationMs;
      cursor = endMs;
      return {
        index: index + 1,
        startMs,
        endMs,
        text: scene.caption.trim(),
      };
    })
    .filter((cue) => Boolean(cue.text));
}

export function buildSrt(cues: SubtitleCue[]): string {
  return `${cues
    .map(
      (cue) =>
        `${cue.index}\n${formatSrtTimestamp(cue.startMs)} --> ${formatSrtTimestamp(cue.endMs)}\n${cue.text}\n`,
    )
    .join('\n')}\n`;
}

