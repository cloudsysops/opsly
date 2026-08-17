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
