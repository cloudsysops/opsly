import type { Scene } from '../domain/types.js';
import type { ChannelPreset } from '../presets/types.js';
import { animateStill, generateSilence, padOrTrimAudio } from './ffmpeg-adapter.js';
import { buildMotionFilter } from './motion.js';

/** Renders one scene's silent visual clip (image -> Ken Burns motion -> fixed-duration video). */
export async function renderSceneVisual(
  scene: Scene,
  imagePath: string,
  preset: ChannelPreset,
  outputPath: string
): Promise<void> {
  const durationSec = scene.durationMs / 1000;
  const motionFilter = buildMotionFilter(scene.motion, {
    width: preset.resolution.width,
    height: preset.resolution.height,
    fps: preset.fps,
    durationSec,
  });
  await animateStill(imagePath, outputPath, {
    width: preset.resolution.width,
    height: preset.resolution.height,
    fps: preset.fps,
    durationSec,
    motionFilter,
  });
}

/**
 * Renders one scene's audio segment, exactly matching the scene's video
 * duration: the scene's voiceover file if present, otherwise silence. This
 * keeps the per-scene audio timeline in lockstep with the per-scene video
 * timeline so a simple concat of both tracks stays in sync end to end.
 */
export async function renderSceneAudioSegment(
  scene: Scene,
  voiceoverPath: string | null,
  outputPath: string
): Promise<void> {
  const durationSec = scene.durationMs / 1000;
  if (voiceoverPath) {
    await padOrTrimAudio(voiceoverPath, outputPath, durationSec);
  } else {
    await generateSilence(outputPath, durationSec);
  }
}
