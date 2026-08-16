import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import {
  buildContentMetadata,
} from './metadata.js';
import {
  buildRenderPlan,
} from './render-plan.js';
import {
  buildSrt,
  buildSubtitleCuesFromScenes,
} from './subtitles.js';
import {
  SafeFfmpegAdapter,
} from './ffmpeg.js';
import {
  addProjectRenderJob,
  findProjectEnvelope,
  loadProjectEnvelopeByTenant,
  saveProjectEnvelope,
  setProjectMetadata,
} from './storage.js';
import {
  getContentProjectArtifactsRoot,
  getContentProjectRoot,
  getContentTenantAssetsRoot,
} from './paths.js';
import {
  ContentChannelPreset,
  ContentProjectEnvelope,
  ContentRenderJob,
} from './types.js';
import { loadContentChannelPreset } from './presets.js';
import { validateContentProject } from './validation.js';
import { transitionContentProjectStatus } from './workflow.js';

const execFileAsync = promisify(execFile);

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

function wrapText(text: string, maxCharsPerLine = 28): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function buildSceneCaptionSvg(input: {
  width: number;
  height: number;
  text: string;
  colors: string[];
}): string {
  const lines = wrapText(input.text, 27);
  const safeLines = lines
    .map((line) => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
    .map((line) => `<tspan x="50%" dy="1.15em">${line}</tspan>`)
    .join('');
  const brand = input.colors[0] ?? '#7C3AED';
  const accent = input.colors[1] ?? '#0EA5E9';
  const boxHeight = Math.max(160, Math.round(60 + lines.length * 52));
  const boxWidth = Math.round(input.width * 0.88);
  const boxX = Math.round((input.width - boxWidth) / 2);
  const boxY = Math.round(input.height - boxHeight - 130);
  return `
    <svg width="${input.width}" height="${input.height}" viewBox="0 0 ${input.width} ${input.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="captionGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${brand}" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
      </defs>
      <rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" rx="34" fill="rgba(9, 6, 26, 0.68)" />
      <rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" rx="34" fill="none" stroke="url(#captionGrad)" stroke-width="4" />
      <text x="50%" y="${boxY + 56}" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="700" fill="#ffffff">
        ${safeLines}
      </text>
    </svg>
  `;
}

async function createCaptionedSceneImage(
  sourcePath: string,
  destinationPath: string,
  caption: string,
  colors: string[]
): Promise<void> {
  const image = sharp(sourcePath);
  const metadata = await image.metadata();
  const width = metadata.width ?? 1080;
  const height = metadata.height ?? 1920;
  const svg = Buffer.from(
    buildSceneCaptionSvg({
      width,
      height,
      text: caption,
      colors,
    })
  );
  await image
    .composite([{ input: svg }])
    .jpeg({ quality: 94, mozjpeg: true })
    .toFile(destinationPath);
}

async function binaryExists(bin: string): Promise<boolean> {
  try {
    await execFileAsync('bash', ['-lc', `command -v ${bin}`]);
    return true;
  } catch {
    return false;
  }
}

async function sayVoiceover(text: string, outputPath: string): Promise<void> {
  const hasSay = await binaryExists('say');
  if (!hasSay) {
    throw new Error('Local TTS unavailable: say binary not found');
  }

  await execFileAsync('say', ['-o', outputPath, text]);
}

function selectAssetPath(envelope: ContentProjectEnvelope, assetRef: string): string {
  const asset = envelope.assets.find((candidate) => candidate.id === assetRef);
  if (!asset) {
    throw new Error(`Missing asset ${assetRef}`);
  }
  return asset.path;
}

function firstImageAssetPath(envelope: ContentProjectEnvelope, scene: ContentProjectEnvelope['scenes'][number]): string {
  const assetRef = scene.assetRefs.find((ref) => {
    const asset = envelope.assets.find((candidate) => candidate.id === ref);
    return asset?.type === 'image' || asset?.type === 'thumbnail' || asset?.type === 'video';
  });
  if (!assetRef) {
    throw new Error(`Scene ${scene.id} is missing an image asset`);
  }
  return selectAssetPath(envelope, assetRef);
}

function firstAudioAssetPath(envelope: ContentProjectEnvelope, scene: ContentProjectEnvelope['scenes'][number]): string | null {
  const assetRef = scene.assetRefs.find((ref) => {
    const asset = envelope.assets.find((candidate) => candidate.id === ref);
    return asset?.type === 'voice' || asset?.type === 'audio' || asset?.type === 'music';
  });
  return assetRef ? selectAssetPath(envelope, assetRef) : null;
}

export interface RenderProjectResult {
  projectId: string;
  finalPath: string;
  thumbnailPath: string;
  captionsPath: string;
  metadataPath: string;
  renderPlanPath: string;
  durationSec: number;
}

export async function renderProject(
  projectId: string,
  baseDir = process.cwd()
): Promise<RenderProjectResult> {
  const envelope = await findProjectEnvelope(projectId, baseDir);
  if (!envelope) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const preset = await loadContentChannelPreset(envelope.project.preset, baseDir);
  const validation = await validateContentProject(envelope, baseDir);
  if (!validation.valid) {
    throw new Error(`CONTENT_PROJECT_INVALID\n${validation.errors.map((error) => `${error.code}: ${error.message}`).join('\n')}`);
  }

  const ffmpeg = new SafeFfmpegAdapter();
  await ffmpeg.ensureInstalled();

  const workDir = await fs.mkdtemp(path.join(await getContentProjectArtifactsRoot(projectId, baseDir), 'work-'));
  const finalDir = await getContentProjectArtifactsRoot(projectId, baseDir);
  await ensureDir(finalDir);
  const projectRoot = await getContentProjectRoot(projectId, envelope.project.tenantId, baseDir);
  const tenantAssetsRoot = await getContentTenantAssetsRoot(envelope.project.tenantId, baseDir);
  const renderPlanPath = path.join(finalDir, 'render-plan.txt');
  const captionsPath = path.join(finalDir, 'captions.srt');
  const metadataPath = path.join(finalDir, 'metadata.json');
  const finalConcatPath = path.join(finalDir, 'final.concat.mp4');
  const finalPath = path.join(finalDir, 'final.mp4');
  const thumbnailPath = path.join(finalDir, 'thumbnail.jpg');
  const workingCaptionsPath = path.join(workDir, 'captions.srt');
  const sceneClipPaths: string[] = [];

  const sortedScenes = [...envelope.scenes].sort((a, b) => a.order - b.order);
  const srt = buildSrt(buildSubtitleCuesFromScenes(sortedScenes));
  await fs.writeFile(captionsPath, srt, 'utf8');
  await fs.writeFile(workingCaptionsPath, srt, 'utf8');
  await fs.writeFile(renderPlanPath, buildRenderPlan(envelope, preset), 'utf8');

  let totalDurationMs = 0;
  const renderableEnvelope = {
    ...envelope,
    project: {
      ...envelope.project,
      status: transitionContentProjectStatus(envelope.project.status, 'ready_to_render'),
    },
  };
  for (const scene of sortedScenes) {
    totalDurationMs += scene.durationMs;
    const sceneDir = path.join(workDir, `scene-${String(scene.order).padStart(2, '0')}`);
    await ensureDir(sceneDir);
    const captionPath = path.join(sceneDir, 'caption.txt');
    await fs.writeFile(captionPath, scene.caption.trim() || '', 'utf8');
    const imagePath = path.resolve(baseDir, firstImageAssetPath(renderableEnvelope, scene));
    const captionedImagePath = path.join(sceneDir, 'captioned.jpg');
    await createCaptionedSceneImage(imagePath, captionedImagePath, scene.caption, preset.brandColors);
    const audioAssetPath = firstAudioAssetPath(renderableEnvelope, scene);
    const videoAudioPath = path.join(sceneDir, 'voice.aac');
    const voiceSource = scene.voiceover?.trim() || null;
    if (voiceSource && (await binaryExists('say'))) {
      const spokenPath = path.join(sceneDir, 'voice.aiff');
      await sayVoiceover(voiceSource, spokenPath);
      await ffmpeg.fitAudioToDuration(spokenPath, videoAudioPath, scene.durationMs / 1000);
    } else if (audioAssetPath) {
      await ffmpeg.fitAudioToDuration(path.resolve(baseDir, audioAssetPath), videoAudioPath, scene.durationMs / 1000);
    } else {
      await ffmpeg.createSilentAudio(videoAudioPath, scene.durationMs / 1000);
    }

    const clipPath = path.join(sceneDir, 'scene.mp4');
    await ffmpeg.renderSceneClip({
      imagePath: captionedImagePath,
      audioPath: videoAudioPath,
      outputPath: clipPath,
      durationMs: scene.durationMs,
      preset,
      motion: scene.motion,
    });
    sceneClipPaths.push(clipPath);
  }

  await ffmpeg.concat(sceneClipPaths, finalConcatPath, workDir);
  await fs.copyFile(finalConcatPath, finalPath);
  await ffmpeg.generateThumbnail({
    sourcePath: finalPath,
    outputPath: thumbnailPath,
    preset,
    title: envelope.project.title,
  });

  const metadata = buildContentMetadata(envelope);
  await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');

  const renderJob: ContentRenderJob = {
    id: `render-${Date.now()}`,
    projectId: envelope.project.id,
    status: 'completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    outputPath: finalPath,
    logs: [`Rendered ${sceneClipPaths.length} scenes`],
  };
  const updatedEnvelope = setProjectMetadata(
    addProjectRenderJob(
      {
        ...renderableEnvelope,
        project: {
          ...renderableEnvelope.project,
          status: transitionContentProjectStatus(renderableEnvelope.project.status, 'rendering'),
        },
      },
      renderJob
    ),
    metadata
  );
  updatedEnvelope.project.status = 'ready_for_review';
  await saveProjectEnvelope(updatedEnvelope, baseDir);

  return {
    projectId,
    finalPath,
    thumbnailPath,
    captionsPath,
    metadataPath,
    renderPlanPath,
    durationSec: Number((totalDurationMs / 1000).toFixed(1)),
  };
}
