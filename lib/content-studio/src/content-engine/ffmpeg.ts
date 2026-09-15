import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export type FfmpegOp =
  | 'probe'
  | 'extractClip'
  | 'verticalReframe'
  | 'splitScreen'
  | 'freezeFrame'
  | 'captionBurn'
  | 'concat'
  | 'thumbnail'
  | 'extractAudio'
  | 'generateFixture'
  | 'titleCard'
  | 'overlayCharacter';

export interface SilenceInterval {
  start: number;
  end: number;
}

export function parseSilenceDetectOutput(stderr: string): SilenceInterval[] {
  const starts = [...stderr.matchAll(/silence_start:\s*(-?[\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...stderr.matchAll(/silence_end:\s*(-?[\d.]+)/g)].map((m) => Number(m[1]));
  const count = Math.min(starts.length, ends.length);
  const intervals: SilenceInterval[] = [];
  for (let i = 0; i < count; i += 1) {
    intervals.push({ start: starts[i], end: ends[i] });
  }
  return intervals;
}

function assertSafePath(filePath: string): string {
  const resolved = path.resolve(filePath);
  if (resolved.includes('\0')) {
    throw new Error('Invalid path');
  }
  return resolved;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-800)}`));
    });
  });
}

export function detectSilence(input: string, noiseDb = -30, minDurationSec = 0.5): Promise<SilenceInterval[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'ffmpeg',
      ['-i', assertSafePath(input), '-af', `silencedetect=noise=${noiseDb}dB:d=${minDurationSec}`, '-f', 'null', '-'],
      { stdio: ['ignore', 'ignore', 'pipe'] }
    );
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg silencedetect failed (${code}): ${stderr.slice(-800)}`));
        return;
      }
      resolve(parseSilenceDetectOutput(stderr));
    });
  });
}

function runFfprobe(filePath: string): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'ffprobe',
      ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', assertSafePath(filePath)],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed: ${stderr.slice(-400)}`));
        return;
      }
      const parsed = JSON.parse(stdout) as {
        format?: { duration?: string };
        streams?: Array<{ width?: number; height?: number; codec_type?: string }>;
      };
      const video = parsed.streams?.find((stream) => stream.codec_type === 'video');
      resolve({
        duration: Number(parsed.format?.duration ?? 0),
        width: video?.width ?? 0,
        height: video?.height ?? 0,
      });
    });
  });
}

export function ffmpegAvailable(): boolean {
  const result = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  return result.status === 0;
}

function defaultFontFile(): string | null {
  const candidates = [
    '/System/Library/Fonts/Supplemental/Arial.ttf',
    '/Library/Fonts/Arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
  ];
  return candidates.find((file) => fs.existsSync(file)) ?? null;
}

function drawtextFilter(text: string, extras: string): string {
  const font = defaultFontFile();
  const fontPart = font ? `fontfile=${font}:` : '';
  return `drawtext=${fontPart}text='${sanitizeDrawtext(text)}':${extras}`;
}

export async function probeMedia(filePath: string): Promise<{ duration: number; width: number; height: number }> {
  return runFfprobe(filePath);
}

export interface MediaProbe {
  duration: number;
  width: number;
  height: number;
  videoCodec: string;
  audioCodec: string | null;
  hasAudio: boolean;
  aspect: string;
}

export async function probeMediaDetailed(filePath: string): Promise<MediaProbe> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'ffprobe',
      ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', assertSafePath(filePath)],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed: ${stderr.slice(-400)}`));
        return;
      }
      const parsed = JSON.parse(stdout) as {
        format?: { duration?: string };
        streams?: Array<{
          width?: number;
          height?: number;
          codec_type?: string;
          codec_name?: string;
        }>;
      };
      const video = parsed.streams?.find((stream) => stream.codec_type === 'video');
      const audio = parsed.streams?.find((stream) => stream.codec_type === 'audio');
      const width = video?.width ?? 0;
      const height = video?.height ?? 0;
      resolve({
        duration: Number(parsed.format?.duration ?? 0),
        width,
        height,
        videoCodec: video?.codec_name ?? 'unknown',
        audioCodec: audio?.codec_name ?? null,
        hasAudio: Boolean(audio),
        aspect: width > 0 && height > 0 ? `${width}:${height}` : 'unknown',
      });
    });
  });
}

function parseDetectIntervals(stderr: string, startKey: string, endKey: string): SilenceInterval[] {
  const starts = [...stderr.matchAll(new RegExp(`${startKey}:\\s*(-?[\\d.]+)`, 'g'))].map((m) => Number(m[1]));
  const ends = [...stderr.matchAll(new RegExp(`${endKey}:\\s*(-?[\\d.]+)`, 'g'))].map((m) => Number(m[1]));
  const count = Math.min(starts.length, ends.length);
  const intervals: SilenceInterval[] = [];
  for (let i = 0; i < count; i += 1) {
    intervals.push({ start: starts[i], end: ends[i] });
  }
  return intervals;
}

export function detectBlackFrames(input: string, minDurationSec = 0.8): Promise<SilenceInterval[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'ffmpeg',
      ['-i', assertSafePath(input), '-vf', `blackdetect=d=${minDurationSec}:pix_th=0.10`, '-f', 'null', '-'],
      { stdio: ['ignore', 'ignore', 'pipe'] }
    );
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg blackdetect failed (${code}): ${stderr.slice(-400)}`));
        return;
      }
      resolve(parseDetectIntervals(stderr, 'black_start', 'black_end'));
    });
  });
}

export function detectFrozenFrames(input: string, minDurationSec = 1): Promise<SilenceInterval[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'ffmpeg',
      ['-i', assertSafePath(input), '-vf', `freezedetect=n=-60dB:d=${minDurationSec}`, '-f', 'null', '-'],
      { stdio: ['ignore', 'ignore', 'pipe'] }
    );
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg freezedetect failed (${code}): ${stderr.slice(-400)}`));
        return;
      }
      resolve(parseDetectIntervals(stderr, 'freeze_start', 'freeze_end'));
    });
  });
}

export function measureMeanVolume(input: string): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'ffmpeg',
      ['-i', assertSafePath(input), '-af', 'volumedetect', '-f', 'null', '-'],
      { stdio: ['ignore', 'ignore', 'pipe'] }
    );
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg volumedetect failed (${code}): ${stderr.slice(-400)}`));
        return;
      }
      const match = stderr.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
      resolve(match ? Number(match[1]) : null);
    });
  });
}

export async function trimMedia(input: string, output: string, startSec: number, durationSec?: number): Promise<void> {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const args = [
    '-y',
    '-ss',
    String(Math.max(0, startSec)),
    '-i',
    assertSafePath(input),
  ];
  if (durationSec !== undefined) {
    args.push('-t', String(Math.max(0.5, durationSec)));
  }
  args.push('-c:v', 'libx264', '-c:a', 'aac', '-pix_fmt', 'yuv420p', assertSafePath(output));
  await runFfmpeg(args);
}

export async function normalizeAudio(input: string, output: string): Promise<void> {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await runFfmpeg([
    '-y',
    '-i',
    assertSafePath(input),
    '-af',
    'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    '-pix_fmt',
    'yuv420p',
    assertSafePath(output),
  ]);
}

/** 9:16 short with 2s black+silence then gameplay — forces a real review finding. */
export async function generateLeadingBlackGameplayFixture(output: string): Promise<void> {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await runFfmpeg([
    '-y',
    '-f',
    'lavfi',
    '-i',
    'color=c=black:s=1080x1920:d=2',
    '-f',
    'lavfi',
    '-i',
    'anullsrc=r=44100:cl=stereo:d=2',
    '-f',
    'lavfi',
    '-i',
    'color=c=0x1a1a2e:s=1080x1920:d=8',
    '-f',
    'lavfi',
    '-i',
    'sine=f=440:d=8',
    '-filter_complex',
    '[0:v][2:v]concat=n=2:v=1:a=0[v];[1:a][3:a]concat=n=2:v=0:a=1[a]',
    '-map',
    '[v]',
    '-map',
    '[a]',
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    '-pix_fmt',
    'yuv420p',
    '-t',
    '10',
    assertSafePath(output),
  ]);
}

export function sanitizeDrawtext(text: string): string {
  return text.replace(/[':\\[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90);
}

export async function extractClip(input: string, output: string, startSec: number, durationSec: number): Promise<void> {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await runFfmpeg([
    '-y',
    '-ss',
    String(Math.max(0, startSec)),
    '-i',
    assertSafePath(input),
    '-t',
    String(Math.max(0.5, durationSec)),
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    '-pix_fmt',
    'yuv420p',
    assertSafePath(output),
  ]);
}

export async function verticalReframe(input: string, output: string): Promise<void> {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await runFfmpeg([
    '-y',
    '-i',
    assertSafePath(input),
    '-vf',
    'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    '-pix_fmt',
    'yuv420p',
    assertSafePath(output),
  ]);
}

export async function freezeFrame(input: string, output: string, atSec: number, durationSec: number): Promise<void> {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const still = `${output}.still.png`;
  await runFfmpeg([
    '-y',
    '-ss',
    String(Math.max(0, atSec)),
    '-i',
    assertSafePath(input),
    '-frames:v',
    '1',
    assertSafePath(still),
  ]);
  await runFfmpeg([
    '-y',
    '-loop',
    '1',
    '-i',
    assertSafePath(still),
    '-t',
    String(Math.max(0.5, durationSec)),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-an',
    assertSafePath(output),
  ]);
}

export async function splitScreen(top: string, bottom: string, output: string): Promise<void> {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await runFfmpeg([
    '-y',
    '-i',
    assertSafePath(top),
    '-i',
    assertSafePath(bottom),
    '-filter_complex',
    '[0:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[top];[1:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[bottom];[top][bottom]vstack=inputs=2',
    '-c:v',
    'libx264',
    '-t',
    '8',
    '-an',
    '-pix_fmt',
    'yuv420p',
    assertSafePath(output),
  ]);
}

export async function captionBurn(input: string, output: string, caption: string): Promise<void> {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  try {
    await runFfmpeg([
      '-y',
      '-i',
      assertSafePath(input),
      '-vf',
      drawtextFilter(caption, 'fontcolor=white:fontsize=42:borderw=3:x=(w-text_w)/2:y=h-220'),
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      '-pix_fmt',
      'yuv420p',
      assertSafePath(output),
    ]);
  } catch {
    await runFfmpeg([
      '-y',
      '-i',
      assertSafePath(input),
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      '-pix_fmt',
      'yuv420p',
      assertSafePath(output),
    ]);
  }
}

export async function overlayCharacter(input: string, output: string, name: string): Promise<void> {
  await captionBurn(input, output, name);
}

export async function writeSrt(filePath: string, caption: string, durationSec: number): Promise<void> {
  const end = Math.max(1, Math.round(durationSec));
  const body = `1\n00:00:00,000 --> 00:00:${String(end).padStart(2, '0')},000\n${caption}\n`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, body, 'utf8');
}

export async function thumbnail(input: string, output: string, atSec = 1): Promise<void> {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await runFfmpeg([
    '-y',
    '-ss',
    String(Math.max(0, atSec)),
    '-i',
    assertSafePath(input),
    '-frames:v',
    '1',
    assertSafePath(output),
  ]);
}

export async function extractAudio(input: string, output: string): Promise<void> {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await runFfmpeg(['-y', '-i', assertSafePath(input), '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', assertSafePath(output)]);
}

export async function titleCard(output: string, text: string, durationSec = 3, color = '0x1D0B3A'): Promise<void> {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const args = [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `color=c=${color}:s=1080x1920:d=${durationSec}`,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    assertSafePath(output),
  ];
  try {
    await runFfmpeg([
      '-y',
      '-f',
      'lavfi',
      '-i',
      `color=c=${color}:s=1080x1920:d=${durationSec}`,
      '-vf',
      drawtextFilter(text, 'fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2'),
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      assertSafePath(output),
    ]);
  } catch {
    await runFfmpeg(args);
  }
}

export async function concatVideos(inputs: string[], output: string): Promise<void> {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const listPath = `${output}.concat.txt`;
  const body = inputs.map((file) => `file '${assertSafePath(file).replace(/'/g, "'\\''")}'`).join('\n');
  fs.writeFileSync(listPath, body, 'utf8');
  await runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', assertSafePath(output)]);
}

export async function generateOwnedFixture(output: string, durationSec = 48): Promise<void> {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await runFfmpeg([
    '-y',
    '-f',
    'lavfi',
    '-i',
    `color=c=0x123456:s=1280x720:d=${durationSec}`,
    '-f',
    'lavfi',
    '-i',
    `sine=f=440:d=${durationSec}`,
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    '-shortest',
    '-pix_fmt',
    'yuv420p',
    assertSafePath(output),
  ]);
}

/** Synthetic gameplay with loud bursts separated by silence — for audio-peak discovery. */
export async function generatePeakedGameplayFixture(output: string): Promise<void> {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await runFfmpeg([
    '-y',
    '-f',
    'lavfi',
    '-i',
    'color=c=0x1a1a2e:s=1280x720:d=19',
    '-f',
    'lavfi',
    '-i',
    "sine=f=440:d=19,volume=eval=frame:volume='if(between(t,0,5)+between(t,7,12)+between(t,14,19),1,0)'",
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    '-shortest',
    '-pix_fmt',
    'yuv420p',
    assertSafePath(output),
  ]);
}

export const FFMPEG_OPS: FfmpegOp[] = [
  'probe',
  'extractClip',
  'verticalReframe',
  'splitScreen',
  'freezeFrame',
  'captionBurn',
  'concat',
  'thumbnail',
  'extractAudio',
  'generateFixture',
  'titleCard',
  'overlayCharacter',
];
