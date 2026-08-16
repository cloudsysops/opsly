import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import type { ContentChannelPreset, ContentMotion } from './types.js';

export interface FfprobeSummary {
  durationSec: number;
  width?: number;
  height?: number;
  videoCodec?: string;
  audioCodec?: string;
  hasAudio: boolean;
  hasVideo: boolean;
}

export interface SceneClipRenderInput {
  imagePath: string;
  audioPath: string;
  outputPath: string;
  durationMs: number;
  preset: ContentChannelPreset;
  motion: ContentMotion;
  captionPath?: string;
}

export interface ThumbnailRenderInput {
  sourcePath: string;
  outputPath: string;
  preset: ContentChannelPreset;
  title: string;
}

function runBinary(
  bin: string,
  args: string[],
  options: { cwd?: string; timeoutMs?: number } = {}
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd: options.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    const timeout = options.timeoutMs
      ? setTimeout(() => {
          child.kill('SIGKILL');
          reject(new Error(`${bin} timed out after ${options.timeoutMs}ms`));
        }, options.timeoutMs)
      : null;
    child.on('error', (error) => {
      if (timeout) clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      if (timeout) clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${bin} failed with code ${code}: ${stderr || stdout}`));
    });
  });
}

function ensureFileText(value: string): string {
  return value.replace(/\r?\n/g, ' ').trim();
}

function escapePathForFilter(filePath: string): string {
  return filePath.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

function motionFilter(
  motion: ContentMotion,
  preset: ContentChannelPreset,
  durationMs: number
): string {
  const frames = Math.max(1, Math.round((durationMs / 1000) * preset.fps));
  const width = preset.resolution.width;
  const height = preset.resolution.height;
  const zoomStep = (0.12 / frames).toFixed(7);
  const panStep = (0.08 / frames).toFixed(7);

  switch (motion) {
    case 'zoom-out':
      return `zoompan=z='1.12-${zoomStep}*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${preset.fps}`;
    case 'pan-left':
      return `zoompan=z='1.08':x='iw/2-(iw/zoom/2)-${panStep}*on':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${preset.fps}`;
    case 'pan-right':
      return `zoompan=z='1.08':x='iw/2-(iw/zoom/2)+${panStep}*on':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${preset.fps}`;
    case 'static':
    default:
      return `zoompan=z='1.04':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${preset.fps}`;
  }
}

function captionOverlayFilter(captionPath: string): string {
  return `drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:textfile='${escapePathForFilter(captionPath)}':reload=0:fontcolor=white:fontsize=58:box=1:boxcolor=0x09061AC0:boxborderw=22:line_spacing=10:x=(w-text_w)/2:y=h-(text_h*2.75)`;
}

function buildThumbnailOverlaySvg(input: { width: number; height: number; title: string; colors: string[] }): string {
  const title = ensureFileText(input.title);
  const safeTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const brand = input.colors[0] ?? '#7C3AED';
  const accent = input.colors[1] ?? '#0EA5E9';
  const topBandHeight = Math.round(input.height * 0.18);
  const boxWidth = Math.round(input.width * 0.84);
  const boxX = Math.round((input.width - boxWidth) / 2);
  const boxY = Math.round(input.height * 0.08);
  return `
    <svg width="${input.width}" height="${input.height}" viewBox="0 0 ${input.width} ${input.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${brand}" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
      </defs>
      <rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="${topBandHeight}" rx="36" fill="rgba(9, 6, 26, 0.72)" />
      <rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="${topBandHeight}" rx="36" fill="none" stroke="url(#titleGrad)" stroke-width="4" />
      <text x="50%" y="${boxY + Math.round(topBandHeight * 0.42)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.max(42, Math.round(input.height * 0.045))}" fill="#ffffff" font-weight="700">
        <tspan x="50%" dy="0">${safeTitle}</tspan>
      </text>
    </svg>
  `;
}

export class SafeFfmpegAdapter {
  constructor(
    private readonly ffmpegPath = 'ffmpeg',
    private readonly ffprobePath = 'ffprobe'
  ) {}

  async ensureInstalled(): Promise<void> {
    await runBinary(this.ffmpegPath, ['-version'], { timeoutMs: 10_000 });
    await runBinary(this.ffprobePath, ['-version'], { timeoutMs: 10_000 });
  }

  async probe(inputPath: string): Promise<FfprobeSummary> {
    const { stdout } = await runBinary(
      this.ffprobePath,
      [
        '-v',
        'error',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        inputPath,
      ],
      { timeoutMs: 20_000 }
    );
    const parsed = JSON.parse(stdout) as {
      streams?: Array<Record<string, unknown>>;
      format?: Record<string, unknown>;
    };
    const video = parsed.streams?.find((stream) => stream.codec_type === 'video');
    const audio = parsed.streams?.find((stream) => stream.codec_type === 'audio');
    return {
      durationSec: Number(parsed.format?.duration ?? 0),
      width: video?.width ? Number(video.width) : undefined,
      height: video?.height ? Number(video.height) : undefined,
      videoCodec: typeof video?.codec_name === 'string' ? video.codec_name : undefined,
      audioCodec: typeof audio?.codec_name === 'string' ? audio.codec_name : undefined,
      hasAudio: Boolean(audio),
      hasVideo: Boolean(video),
    };
  }

  buildSceneClipArgs(input: SceneClipRenderInput): string[] {
    const durationSec = Math.max(0.5, input.durationMs / 1000);
    const filter = motionFilter(input.motion, input.preset, input.durationMs);
    const vf = input.captionPath ? `${filter},${captionOverlayFilter(input.captionPath)}` : filter;
    const args = [
      '-y',
      '-loop',
      '1',
      '-i',
      input.imagePath,
      '-i',
      input.audioPath,
      '-vf',
      vf,
      '-r',
      String(input.preset.fps),
      '-t',
      String(durationSec),
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-shortest',
      input.outputPath,
    ];
    return args;
  }

  async renderSceneClip(input: SceneClipRenderInput): Promise<void> {
    await runBinary(this.ffmpegPath, this.buildSceneClipArgs(input), { timeoutMs: 120_000 });
  }

  buildBurnSubtitlesArgs(input: {
    sourcePath: string;
    subtitlesPath: string;
    outputPath: string;
  }): string[] {
    return [
      '-y',
      '-i',
      input.sourcePath,
      '-vf',
      `subtitles=filename='${escapePathForFilter(input.subtitlesPath)}'`,
      '-c:a',
      'copy',
      input.outputPath,
    ];
  }

  async burnSubtitles(input: {
    sourcePath: string;
    subtitlesPath: string;
    outputPath: string;
    cwd?: string;
  }): Promise<void> {
    await runBinary(this.ffmpegPath, this.buildBurnSubtitlesArgs(input), {
      timeoutMs: 120_000,
      cwd: input.cwd,
    });
  }

  buildThumbnailArgs(input: ThumbnailRenderInput): string[] {
    return ['-y', '-i', input.sourcePath, '-frames:v', '1', input.outputPath];
  }

  async generateThumbnail(input: ThumbnailRenderInput): Promise<void> {
    const tempFramePath = `${input.outputPath}.frame.png`;
    try {
      await runBinary(this.ffmpegPath, this.buildThumbnailArgs(input), { timeoutMs: 60_000 });
      const frame = sharp(input.outputPath);
      const meta = await frame.metadata();
      const width = meta.width ?? input.preset.resolution.width;
      const height = meta.height ?? input.preset.resolution.height;
      const svg = Buffer.from(
        buildThumbnailOverlaySvg({
          width,
          height,
          title: input.title,
          colors: input.preset.brandColors,
        })
      );
      await frame
        .composite([{ input: svg }])
        .jpeg({ quality: 92, mozjpeg: true })
        .toFile(tempFramePath);
      await fs.rename(tempFramePath, input.outputPath);
    } finally {
      await fs.rm(tempFramePath, { force: true }).catch(() => {});
    }
  }

  buildConcatList(paths: string[]): string {
    return `${paths.map((filePath) => `file '${filePath.replace(/'/g, "'\\''")}'`).join('\n')}\n`;
  }

  async concat(inputs: string[], outputPath: string, cwd: string): Promise<void> {
    const concatListPath = path.join(cwd, 'concat.txt');
    await fs.writeFile(concatListPath, this.buildConcatList(inputs), 'utf8');
    try {
      await runBinary(this.ffmpegPath, ['-y', '-f', 'concat', '-safe', '0', '-i', concatListPath, '-c', 'copy', outputPath], {
        timeoutMs: 120_000,
      });
    } finally {
      await fs.rm(concatListPath, { force: true }).catch(() => {});
    }
  }

  buildNormalizeAudioArgs(input: { sourcePath: string; outputPath: string; durationSec?: number }): string[] {
    const filters = ['loudnorm=I=-16:TP=-1.5:LRA=11'];
    if (input.durationSec) {
      filters.push(`apad=pad_dur=${input.durationSec}`);
    }
    return ['-y', '-i', input.sourcePath, '-af', filters.join(','), '-c:a', 'aac', '-b:a', '192k', input.outputPath];
  }

  async normalizeAudio(input: { sourcePath: string; outputPath: string; durationSec?: number }): Promise<void> {
    await runBinary(this.ffmpegPath, this.buildNormalizeAudioArgs(input), { timeoutMs: 60_000 });
  }

  buildMixAudioArgs(input: {
    sourcePaths: string[];
    outputPath: string;
  }): string[] {
    if (input.sourcePaths.length < 2) {
      throw new Error('mixAudio requires at least two source paths');
    }
    const args = ['-y'];
    for (const sourcePath of input.sourcePaths) {
      args.push('-i', sourcePath);
    }
    const amixInputs = input.sourcePaths.map((_, index) => `[${index}:a]`).join('');
    args.push('-filter_complex', `${amixInputs}amix=inputs=${input.sourcePaths.length}:normalize=1[a]`, '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', input.outputPath);
    return args;
  }

  async mixAudio(input: { sourcePaths: string[]; outputPath: string }): Promise<void> {
    await runBinary(this.ffmpegPath, this.buildMixAudioArgs(input), { timeoutMs: 120_000 });
  }

  async createSilentAudio(outputPath: string, durationSec: number): Promise<void> {
    await runBinary(
      this.ffmpegPath,
      [
        '-y',
        '-f',
        'lavfi',
        '-i',
        'anullsrc=channel_layout=stereo:sample_rate=48000',
        '-t',
        String(durationSec),
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        outputPath,
      ],
      { timeoutMs: 30_000 }
    );
  }

  async fitAudioToDuration(sourcePath: string, outputPath: string, durationSec: number): Promise<void> {
    await runBinary(
      this.ffmpegPath,
      [
        '-y',
        '-i',
        sourcePath,
        '-af',
        `apad=pad_dur=${durationSec},atrim=duration=${durationSec}`,
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        outputPath,
      ],
      { timeoutMs: 60_000 }
    );
  }
}
