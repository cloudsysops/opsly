#!/usr/bin/env node
// Deterministic FFmpeg title-card render for Content Studio / MoneyPrinter bridge.
// Fails closed if ffmpeg is missing. Never writes a fake MP4.

import { spawn, spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export class FfmpegNotAvailableError extends Error {
  constructor() {
    super(
      'ffmpeg is not installed or not on PATH. Install it before rendering. This job will not fake an MP4.',
    );
    this.name = 'FfmpegNotAvailableError';
  }
}

export function escapeDrawtext(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%');
}

export function resolveCanvas(aspectRatio) {
  if (aspectRatio === '16:9') return { width: 1920, height: 1080 };
  return { width: 1080, height: 1920 };
}

export function clampDurationSec(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 8;
  return Math.min(15, Math.max(3, Math.round(n)));
}

export function buildTitleCardArgs(input) {
  const { width, height } = resolveCanvas(input.aspectRatio);
  const duration = clampDurationSec(input.durationSec);
  const title = escapeDrawtext(input.title || 'Opsly');
  const useDrawtext = input.useDrawtext !== false;
  const filter = useDrawtext
    ? `drawtext=text='${title}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.45:boxborderw=24`
    : 'format=yuv420p';
  return {
    width,
    height,
    duration,
    usedDrawtext: useDrawtext,
    videoArgs: [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      `color=c=0x0a0a0a:s=${width}x${height}:d=${duration}`,
      '-vf',
      filter,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-t',
      String(duration),
      input.videoPath,
    ],
    thumbArgs: [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      input.videoPath,
      '-vframes',
      '1',
      '-q:v',
      '3',
      input.thumbPath,
    ],
  };
}

export function isFfmpegAvailable(runner = spawnSync) {
  const result = runner('ffmpeg', ['-version'], { stdio: 'ignore' });
  return result.status === 0;
}

export function isDrawtextAvailable(runner = spawnSync) {
  const result = runner('ffmpeg', ['-hide_banner', '-filters'], { encoding: 'utf8' });
  return result.status === 0 && typeof result.stdout === 'string' && result.stdout.includes('drawtext');
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-2000)}`));
    });
  });
}

export async function renderTitleCard(input) {
  if (!isFfmpegAvailable()) {
    throw new FfmpegNotAvailableError();
  }
  const plan = buildTitleCardArgs({
    ...input,
    useDrawtext: isDrawtextAvailable(),
  });
  await mkdir(dirname(input.videoPath), { recursive: true });
  await runFfmpeg(plan.videoArgs);
  await runFfmpeg(plan.thumbArgs);
  return {
    videoPath: input.videoPath,
    thumbPath: input.thumbPath,
    width: plan.width,
    height: plan.height,
    durationSec: plan.duration,
  };
}
