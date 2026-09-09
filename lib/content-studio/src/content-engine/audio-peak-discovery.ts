import { detectSilence, probeMedia } from './ffmpeg.js';
import type { SilenceInterval } from './ffmpeg.js';
import type { ClipCandidate as ClipCandidateType } from './types.js';

export function computeLoudSegments(
  totalDurationSec: number,
  silences: SilenceInterval[],
  options?: { minSec?: number; maxSec?: number }
): Array<{ start: number; end: number }> {
  const minSec = options?.minSec ?? 3;
  const maxSec = options?.maxSec ?? 30;
  const sorted = [...silences].sort((a, b) => a.start - b.start);
  const raw: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const silence of sorted) {
    if (silence.start > cursor) {
      raw.push({ start: cursor, end: silence.start });
    }
    cursor = Math.max(cursor, silence.end);
  }
  if (cursor < totalDurationSec) {
    raw.push({ start: cursor, end: totalDurationSec });
  }
  return raw
    .filter((segment) => segment.end - segment.start >= minSec)
    .map((segment) => ({ start: segment.start, end: Math.min(segment.end, segment.start + maxSec) }));
}

export async function discoverClipsFromAudioPeaks(
  audioPath: string,
  options?: { minSec?: number; maxSec?: number; limit?: number; noiseDb?: number; silenceMinSec?: number }
): Promise<ClipCandidateType[]> {
  const limit = options?.limit ?? 5;
  let duration: number;
  try {
    duration = (await probeMedia(audioPath)).duration;
  } catch (error) {
    throw new Error(`AUDIO_PEAK_DISCOVERY_FAILED: could not probe ${audioPath}: ${(error as Error).message}`);
  }
  if (!(duration > 0)) {
    throw new Error(`AUDIO_PEAK_DISCOVERY_FAILED: zero-duration media at ${audioPath}`);
  }
  const silences = await detectSilence(audioPath, options?.noiseDb ?? -30, options?.silenceMinSec ?? 0.5);
  const segments = computeLoudSegments(duration, silences, options);
  if (segments.length === 0) {
    throw new Error(`AUDIO_PEAK_DISCOVERY_EMPTY: no loud segments found in ${audioPath}`);
  }
  return segments
    .map((segment, index) => {
      const segmentDuration = Number((segment.end - segment.start).toFixed(2));
      return {
        id: `audio-peak-${String(index + 1).padStart(3, '0')}`,
        start: segment.start,
        end: segment.end,
        duration: segmentDuration,
        transcript: '',
        hook: 'Gameplay highlight',
        category: 'audio_peak',
        score: Math.min(100, Math.round(segmentDuration * 4)),
        reasons: ['sustained_audio_activity'],
      } satisfies ClipCandidateType;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
