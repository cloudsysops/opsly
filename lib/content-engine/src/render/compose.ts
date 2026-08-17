import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Asset, ContentProject, Scene } from '../domain/types.js';
import type { ChannelPreset } from '../presets/types.js';
import { assetAbsolutePath } from '../storage/asset-store.js';
import { artifactsDir, captionsPath, finalVideoPath, sceneClipPath } from '../storage/paths.js';
import { buildSrt } from '../subtitles/srt.js';
import { buildAudioLevelPlan } from '../audio/levels.js';
import { renderSceneAudioSegment, renderSceneVisual } from './scene-renderer.js';
import { burnSubtitles, concat, mixAudio } from './ffmpeg-adapter.js';

function findAsset(assets: Asset[], id: string): Asset | undefined {
  return assets.find((a) => a.id === id);
}

/** Resolves a scene's primary visual asset to an absolute image/video path. */
function resolveSceneVisualPath(scene: Scene, assets: Asset[]): string {
  const assetId = scene.assetRefs[0];
  if (!assetId) {
    throw new Error(`Scene ${scene.id} has no visual asset (assetRefs is empty)`);
  }
  const asset = findAsset(assets, assetId);
  if (!asset) {
    throw new Error(`Scene ${scene.id} references unknown asset id "${assetId}"`);
  }
  return assetAbsolutePath(asset);
}

/** Resolves a scene's voiceover asset (referenced by asset id in scene.voiceover) if present. */
function resolveSceneVoicePath(scene: Scene, assets: Asset[]): string | null {
  if (!scene.voiceover) return null;
  const asset = findAsset(assets, scene.voiceover);
  if (!asset) {
    throw new Error(`Scene ${scene.id} references unknown voiceover asset id "${scene.voiceover}"`);
  }
  return assetAbsolutePath(asset);
}

export interface ComposeResult {
  outputPath: string;
  captionsPath: string;
  durationMs: number;
}

/**
 * Renders every scene, assembles the silent video track and the voice+music
 * audio track separately (kept duration-synced per scene), muxes them, then
 * burns subtitles — producing the final runtime/content-artifacts/<project>/final.mp4.
 */
export async function composeProject(
  project: ContentProject,
  scenes: Scene[],
  assets: Asset[],
  preset: ChannelPreset,
  musicAssetId?: string
): Promise<ComposeResult> {
  const ordered = [...scenes].sort((a, b) => a.order - b.order);
  if (ordered.length === 0) {
    throw new Error(`Project ${project.id} has no scenes to render`);
  }

  const tmpDir = join(artifactsDir(project.id), 'tmp');

  const visualClips: string[] = [];
  const audioClips: string[] = [];
  for (const scene of ordered) {
    const visualPath = resolveSceneVisualPath(scene, assets);
    const voicePath = resolveSceneVoicePath(scene, assets);

    const visualClipPath = sceneClipPath(project.id, scene.order);
    await renderSceneVisual(scene, visualPath, preset, visualClipPath);
    visualClips.push(visualClipPath);

    const audioClipPath = join(tmpDir, `scene-${String(scene.order).padStart(2, '0')}-audio.m4a`);
    await renderSceneAudioSegment(scene, voicePath, audioClipPath);
    audioClips.push(audioClipPath);
  }

  const silentVideoPath = join(tmpDir, 'silent-full.mp4');
  await concat(visualClips, silentVideoPath);

  const voiceTrackPath = join(tmpDir, 'voice-full.m4a');
  await concat(audioClips, voiceTrackPath);

  const levels = buildAudioLevelPlan(preset);
  const audioTracks = [{ path: voiceTrackPath, volumeDb: 0 }];
  if (musicAssetId) {
    const musicAsset = findAsset(assets, musicAssetId);
    if (!musicAsset) {
      throw new Error(`Unknown music asset id "${musicAssetId}"`);
    }
    audioTracks.push({ path: assetAbsolutePath(musicAsset), volumeDb: levels.musicDuckedDb });
  }

  const withAudioPath = join(tmpDir, 'with-audio.mp4');
  await mixAudio(silentVideoPath, audioTracks, withAudioPath);

  const srtPath = captionsPath(project.id);
  writeFileSync(srtPath, buildSrt(ordered), 'utf8');

  const finalPath = finalVideoPath(project.id);
  await burnSubtitles(withAudioPath, srtPath, finalPath, {
    fontSize: preset.subtitleStyle.fontSize,
    primaryColor: preset.subtitleStyle.primaryColor,
    outlineColor: preset.subtitleStyle.outlineColor,
    outlineWidth: preset.subtitleStyle.outlineWidth,
    marginV: preset.subtitleStyle.marginVerticalPx,
  });

  const durationMs = ordered.reduce((sum, scene) => sum + scene.durationMs, 0);
  return { outputPath: finalPath, captionsPath: srtPath, durationMs };
}
