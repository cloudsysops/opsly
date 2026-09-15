import fs from 'node:fs';
import {
  detectBlackFrames,
  detectFrozenFrames,
  detectSilence,
  measureMeanVolume,
  probeMediaDetailed,
  type MediaProbe,
  type SilenceInterval,
} from './ffmpeg.js';
import type { ReviewFinding } from './types.js';

export interface MediaQaEvidence {
  probe?: MediaProbe;
  meanVolumeDb: number | null;
  findings: ReviewFinding[];
  corrupt: boolean;
}

function finding(
  id: string,
  severity: ReviewFinding['severity'],
  category: ReviewFinding['category'],
  start: number,
  end: number,
  issue: string,
  recommended_fix: string,
  evidence: string,
  repairable: boolean,
): ReviewFinding {
  return {
    finding_id: id,
    severity,
    timecode_start: start,
    timecode_end: end,
    category,
    issue,
    recommended_fix,
    evidence,
    repairable,
  };
}

export async function runDeterministicMediaQa(videoPath: string): Promise<MediaQaEvidence> {
  if (!fs.existsSync(videoPath)) {
    return {
      meanVolumeDb: null,
      findings: [
        finding('media-missing', 'CRITICAL', 'VIDEO', 0, 0, 'Rendered video missing', 'Re-render the clip', videoPath, false),
      ],
      corrupt: true,
    };
  }

  let probe: MediaProbe;
  try {
    probe = await probeMediaDetailed(videoPath);
  } catch (error) {
    return {
      meanVolumeDb: null,
      findings: [
        finding(
          'media-corrupt',
          'CRITICAL',
          'VIDEO',
          0,
          0,
          'ffprobe cannot read the render',
          'Re-render; do not publish',
          error instanceof Error ? error.message : 'ffprobe failed',
          false,
        ),
      ],
      corrupt: true,
    };
  }

  const findings: ReviewFinding[] = [];
  const duration = probe.duration;

  if (probe.width !== 1080 || probe.height !== 1920) {
    findings.push(
      finding(
        'format-aspect',
        'IMPORTANT',
        'FORMAT',
        0,
        duration,
        `Expected 1080x1920, got ${probe.width}x${probe.height}`,
        'verticalReframe to 9:16',
        `probe ${probe.aspect}`,
        true,
      ),
    );
  }
  if (duration < 5 || duration > 90) {
    findings.push(
      finding(
        'format-duration',
        'IMPORTANT',
        'FORMAT',
        0,
        duration,
        `Duration ${duration.toFixed(1)}s is outside 5–90s short window`,
        'Trim or extend the master',
        `duration=${duration}`,
        true,
      ),
    );
  }
  if (!probe.hasAudio) {
    findings.push(
      finding('audio-missing', 'CRITICAL', 'AUDIO', 0, duration, 'No audio stream', 'Re-render with AAC audio', 'hasAudio=false', false),
    );
  }
  if (probe.videoCodec !== 'h264') {
    findings.push(
      finding(
        'format-codec',
        'IMPORTANT',
        'FORMAT',
        0,
        duration,
        `Video codec ${probe.videoCodec} is not libx264/h264`,
        'Re-encode with libx264 yuv420p',
        probe.videoCodec,
        true,
      ),
    );
  }

  const freezeProbe: Promise<SilenceInterval[]> = Promise.race([
    detectFrozenFrames(videoPath),
    new Promise<SilenceInterval[]>((resolve) => {
      setTimeout(() => resolve([]), 8000);
    }),
  ]).catch(() => []);

  const [black, frozen, silence, meanVolumeDb] = await Promise.all([
    detectBlackFrames(videoPath),
    freezeProbe,
    probe.hasAudio ? detectSilence(videoPath, -40, 1) : Promise.resolve([]),
    probe.hasAudio ? measureMeanVolume(videoPath) : Promise.resolve(null),
  ]);

  for (const [index, interval] of black.entries()) {
    const leading = interval.start <= 0.15;
    findings.push(
      finding(
        `black-${index}`,
        'IMPORTANT',
        'VIDEO',
        interval.start,
        interval.end,
        leading ? 'Leading black frames' : 'Black frames in the clip',
        leading ? `Trim from ${interval.end.toFixed(2)}s` : 'Cut the black segment',
        `blackdetect ${interval.start}-${interval.end}`,
        true,
      ),
    );
  }
  for (const [index, interval] of frozen.entries()) {
    const span = interval.end - interval.start;
    if (span >= duration * 0.8) continue;
    findings.push(
      finding(
        `freeze-${index}`,
        'IMPORTANT',
        'VIDEO',
        interval.start,
        interval.end,
        'Frozen frames',
        'Trim the freeze or replace with live frames',
        `freezedetect ${interval.start}-${interval.end}`,
        true,
      ),
    );
  }
  for (const [index, interval] of silence.entries()) {
    const leading = interval.start <= 0.15;
    const trailing = interval.end >= duration - 0.25;
    if (!leading && !trailing && interval.end - interval.start < 3) continue;
    findings.push(
      finding(
        `silence-${index}`,
        'IMPORTANT',
        'AUDIO',
        interval.start,
        interval.end,
        leading ? 'Leading dead air' : trailing ? 'Trailing dead air' : 'Long internal silence',
        leading || trailing ? `Trim ${leading ? 'start' : 'end'} silence` : 'Cut dead air',
        `silencedetect ${interval.start}-${interval.end}`,
        true,
      ),
    );
  }
  if (meanVolumeDb !== null && meanVolumeDb < -45) {
    findings.push(
      finding(
        'audio-quiet',
        'IMPORTANT',
        'AUDIO',
        0,
        duration,
        `Mean volume ${meanVolumeDb.toFixed(1)} dB is too quiet`,
        'Normalize loudness (loudnorm)',
        `mean_volume=${meanVolumeDb}`,
        true,
      ),
    );
  }

  return { probe, meanVolumeDb, findings, corrupt: false };
}
