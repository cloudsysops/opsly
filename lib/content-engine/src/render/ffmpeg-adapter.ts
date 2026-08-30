import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export class FfmpegNotAvailableError extends Error {
  constructor(binary: 'ffmpeg' | 'ffprobe') {
    super(
      `${binary} is not installed or not on PATH. Install it (e.g. \`apt-get install -y ffmpeg\` on Debian/Ubuntu, ` +
        `\`brew install ffmpeg\` on macOS) before rendering. This is a hard blocker — content-engine will not fake a successful render.`
    );
    this.name = 'FfmpegNotAvailableError';
  }
}

let ffmpegAvailable: boolean | null = null;
let ffprobeAvailable: boolean | null = null;

function checkBinary(binary: string): boolean {
  const result = spawnSync(binary, ['-version'], { stdio: 'ignore' });
  return result.status === 0;
}

/** Checks once (cached) whether ffmpeg is on PATH. Never throws. */
export function isFfmpegAvailable(): boolean {
  if (ffmpegAvailable === null) ffmpegAvailable = checkBinary('ffmpeg');
  return ffmpegAvailable;
}

/** Checks once (cached) whether ffprobe is on PATH. Never throws. */
export function isFfprobeAvailable(): boolean {
  if (ffprobeAvailable === null) ffprobeAvailable = checkBinary('ffprobe');
  return ffprobeAvailable;
}

function requireFfmpeg(): void {
  if (!isFfmpegAvailable()) throw new FfmpegNotAvailableError('ffmpeg');
}

function requireFfprobe(): void {
  if (!isFfprobeAvailable()) throw new FfmpegNotAvailableError('ffprobe');
}

/**
 * Escapes text for safe use inside an ffmpeg filtergraph string (drawtext's
 * `text=` parameter). Filtergraph syntax treats `:`, `'`, `\`, and `,` as
 * structural — each must be backslash-escaped, in this order (backslash
 * first, or later escapes double-escape).
 */
export function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%');
}

/** Runs an argv-array ffmpeg command (no shell) and returns combined output on failure. */
function runFfmpeg(args: string[]): Promise<void> {
  requireFfmpeg();
  return new Promise((resolvePromise, reject) => {
    const proc = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-4000)}`));
      }
    });
  });
}

function ensureParentDir(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
}

export interface ProbeResult {
  durationSec: number;
  width?: number;
  height?: number;
  codec?: string;
  hasAudio: boolean;
}

/** ffprobe a media file for duration/dimensions/codec — used by validation and render-plan. */
export function probe(inputPath: string): Promise<ProbeResult> {
  requireFfprobe();
  return new Promise((resolvePromise, reject) => {
    const args = [
      '-v', 'error',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      inputPath,
    ];
    const proc = spawn('ffprobe', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => (stdout += chunk.toString()));
    proc.stderr.on('data', (chunk) => (stderr += chunk.toString()));
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}: ${stderr.slice(-2000)}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as {
          format?: { duration?: string };
          streams?: Array<{ codec_type?: string; codec_name?: string; width?: number; height?: number; duration?: string }>;
        };
        const videoStream = parsed.streams?.find((s) => s.codec_type === 'video');
        const audioStream = parsed.streams?.find((s) => s.codec_type === 'audio');
        const durationSec = Number(parsed.format?.duration ?? videoStream?.duration ?? audioStream?.duration ?? 0);
        resolvePromise({
          durationSec,
          width: videoStream?.width,
          height: videoStream?.height,
          codec: videoStream?.codec_name ?? audioStream?.codec_name,
          hasAudio: Boolean(audioStream),
        });
      } catch (error) {
        reject(new Error(`Failed to parse ffprobe output: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  });
}

/** Scales/pads a static image or video to an exact target resolution (letterbox-free crop-fill). */
export async function scale(
  inputPath: string,
  outputPath: string,
  target: { width: number; height: number }
): Promise<void> {
  ensureParentDir(outputPath);
  const filter =
    `scale=${target.width}:${target.height}:force_original_aspect_ratio=increase,` +
    `crop=${target.width}:${target.height}`;
  await runFfmpeg(['-i', inputPath, '-vf', filter, outputPath]);
}

/** Trims a media file to [startSec, startSec + durationSec). */
export async function trim(
  inputPath: string,
  outputPath: string,
  startSec: number,
  durationSec: number
): Promise<void> {
  ensureParentDir(outputPath);
  await runFfmpeg(['-ss', String(startSec), '-i', inputPath, '-t', String(durationSec), '-c', 'copy', outputPath]);
}

/** Concatenates already-encoded clips (same codec/resolution) via the concat demuxer. */
export async function concat(inputPaths: string[], outputPath: string): Promise<void> {
  ensureParentDir(outputPath);
  const listPath = `${outputPath}.concat-list.txt`;
  ensureParentDir(listPath);
  const { writeFileSync } = await import('node:fs');
  const listContent = inputPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n') + '\n';
  writeFileSync(listPath, listContent, 'utf8');
  await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outputPath]);
}

/** Burns a text overlay onto video/image using the fontconfig-backed drawtext filter. */
export async function overlayText(
  inputPath: string,
  outputPath: string,
  options: {
    text: string;
    fontSize: number;
    fontColor: string;
    x: string;
    y: string;
    box?: boolean;
    boxColor?: string;
  }
): Promise<void> {
  ensureParentDir(outputPath);
  const parts = [
    `text='${escapeDrawtext(options.text)}'`,
    `fontsize=${options.fontSize}`,
    `fontcolor=${options.fontColor}`,
    `x=${options.x}`,
    `y=${options.y}`,
  ];
  if (options.box) {
    parts.push('box=1', `boxcolor=${options.boxColor ?? 'black@0.4'}`, 'boxborderw=20');
  }
  const filter = `drawtext=${parts.join(':')}`;
  await runFfmpeg(['-i', inputPath, '-vf', filter, outputPath]);
}

/** Burns SRT subtitles into a video (hardsub) — used for Shorts/Reels where players may not render soft subs. */
export async function burnSubtitles(
  inputPath: string,
  srtPath: string,
  outputPath: string,
  style: { fontSize: number; primaryColor: string; outlineColor: string; outlineWidth: number; marginV: number }
): Promise<void> {
  ensureParentDir(outputPath);
  const assStyle = [
    `FontSize=${style.fontSize}`,
    `PrimaryColour=${assColor(style.primaryColor)}`,
    `OutlineColour=${assColor(style.outlineColor)}`,
    `Outline=${style.outlineWidth}`,
    `MarginV=${style.marginV}`,
    'Alignment=2',
  ].join(',');
  const escapedSrt = srtPath.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
  const filter = `subtitles='${escapedSrt}':force_style='${assStyle}'`;
  await runFfmpeg(['-i', inputPath, '-vf', filter, '-c:a', 'copy', outputPath]);
}

/** Converts a `#RRGGBB` hex color to libass's `&HAABBGGRR` format (alpha=00 = fully opaque). */
function assColor(hex: string): string {
  const clean = hex.replace('#', '');
  const r = clean.slice(0, 2);
  const g = clean.slice(2, 4);
  const b = clean.slice(4, 6);
  return `&H00${b}${g}${r}`.toUpperCase();
}

/** Mixes a video's existing audio with one or more additional audio tracks (music/voice) at given volumes. */
export async function mixAudio(
  videoPath: string,
  audioTracks: Array<{ path: string; volumeDb: number }>,
  outputPath: string
): Promise<void> {
  ensureParentDir(outputPath);
  const inputs = [videoPath, ...audioTracks.map((t) => t.path)];
  const args: string[] = [];
  for (const input of inputs) args.push('-i', input);

  const audioLabels = audioTracks.map((track, i) => {
    const label = `a${i}`;
    return { label, filter: `[${i + 1}:a]volume=${track.volumeDb}dB[${label}]` };
  });
  const filterGraph = [
    ...audioLabels.map((a) => a.filter),
    `${audioLabels.map((a) => `[${a.label}]`).join('')}amix=inputs=${audioLabels.length}:duration=first[mixed]`,
  ].join(';');

  args.push(
    '-filter_complex', filterGraph,
    '-map', '0:v',
    '-map', '[mixed]',
    '-c:v', 'copy',
    '-shortest',
    outputPath
  );
  await runFfmpeg(args);
}

/** Normalizes audio loudness to a target integrated LUFS using the loudnorm filter (single-pass). */
export async function normalizeAudio(inputPath: string, outputPath: string, targetLufs = -16): Promise<void> {
  ensureParentDir(outputPath);
  await runFfmpeg(['-i', inputPath, '-af', `loudnorm=I=${targetLufs}:TP=-1.5:LRA=11`, outputPath]);
}

/** Extracts a single frame as a JPEG thumbnail. */
export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  atSec: number
): Promise<void> {
  ensureParentDir(outputPath);
  await runFfmpeg(['-ss', String(atSec), '-i', videoPath, '-frames:v', '1', '-q:v', '2', outputPath]);
}

/** Re-encodes to a target codec/container (used to normalize scene clips before concat). */
export async function transcode(
  inputPath: string,
  outputPath: string,
  options: { fps: number; videoCodec?: string; audioCodec?: string }
): Promise<void> {
  ensureParentDir(outputPath);
  await runFfmpeg([
    '-i', inputPath,
    '-r', String(options.fps),
    '-c:v', options.videoCodec ?? 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', options.audioCodec ?? 'aac',
    outputPath,
  ]);
}

/**
 * Turns a still image into a silent motion video clip: scale-to-cover the
 * target frame, apply a zoompan (Ken Burns) filter for `durationSec`, encode
 * at `fps`. This is the core "V1 works even with only images" scene render.
 */
export async function animateStill(
  imagePath: string,
  outputPath: string,
  options: { width: number; height: number; fps: number; durationSec: number; motionFilter: string }
): Promise<void> {
  ensureParentDir(outputPath);
  const scaleFilter =
    `scale=${options.width * 2}:${options.height * 2}:force_original_aspect_ratio=increase,` +
    `crop=${options.width * 2}:${options.height * 2}`;
  const filter = `${scaleFilter},${options.motionFilter},setsar=1`;
  await runFfmpeg([
    '-loop', '1',
    '-i', imagePath,
    '-t', String(options.durationSec),
    '-vf', filter,
    '-r', String(options.fps),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    outputPath,
  ]);
}

/**
 * Forces an audio file to an EXACT duration: trims if longer, pads with
 * silence (via `apad`) if shorter. Re-encodes rather than stream-copies, so
 * the output duration is guaranteed regardless of the source's actual
 * length — required to keep a scene's audio segment in lockstep with its
 * fixed-duration video segment.
 */
export async function padOrTrimAudio(inputPath: string, outputPath: string, durationSec: number): Promise<void> {
  ensureParentDir(outputPath);
  await runFfmpeg([
    '-i', inputPath,
    '-af', 'apad',
    '-t', String(durationSec),
    '-c:a', 'aac',
    outputPath,
  ]);
}

/** Generates a silent audio track of exact duration — used to pad scenes with no voiceover. */
export async function generateSilence(outputPath: string, durationSec: number): Promise<void> {
  ensureParentDir(outputPath);
  await runFfmpeg([
    '-f', 'lavfi',
    '-i', 'anullsrc=r=44100:cl=stereo',
    '-t', String(durationSec),
    '-c:a', 'aac',
    outputPath,
  ]);
}

/** Renders a solid/gradient color field for a fixed duration — used for placeholder scene stills and intro/outro cards. */
export async function generateColorField(
  outputPath: string,
  options: { width: number; height: number; color: string; durationSec: number }
): Promise<void> {
  ensureParentDir(outputPath);
  await runFfmpeg([
    '-f', 'lavfi',
    '-i', `color=c=${options.color}:s=${options.width}x${options.height}:d=${options.durationSec}`,
    '-frames:v', '1',
    outputPath,
  ]);
}

/**
 * Generates a single still image: a solid color field with centered
 * wrapped-ish text. Used ONLY as honestly-labeled placeholder scene art when
 * no real generated/manual asset exists yet — never presented as final art.
 */
export async function generatePlaceholderStill(
  outputPath: string,
  options: { width: number; height: number; backgroundColor: string; text: string; fontSize: number; fontColor: string }
): Promise<void> {
  ensureParentDir(outputPath);
  const filter =
    `drawtext=text='${escapeDrawtext(options.text)}':fontsize=${options.fontSize}:` +
    `fontcolor=${options.fontColor}:x=(w-text_w)/2:y=(h-text_h)/2:line_spacing=12`;
  await runFfmpeg([
    '-f', 'lavfi',
    '-i', `color=c=${options.backgroundColor}:s=${options.width}x${options.height}:d=1`,
    '-vf', filter,
    '-frames:v', '1',
    outputPath,
  ]);
}
