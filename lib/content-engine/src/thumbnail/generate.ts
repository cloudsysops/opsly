import type { ChannelPreset } from '../presets/types.js';
import { generateThumbnail, overlayText } from '../render/ffmpeg-adapter.js';

export interface ThumbnailOptions {
  videoPath: string;
  outputPath: string;
  title: string;
  preset: ChannelPreset;
  /** Second offset into the video to grab the base frame from. */
  atSec?: number;
}

/** Extracts a frame from the final video and overlays a short branded title. */
export async function generateThumbnailFromVideo(options: ThumbnailOptions): Promise<string> {
  const framePath = options.outputPath.replace(/\.jpe?g$/i, '.frame.jpg');
  await generateThumbnail(options.videoPath, framePath, options.atSec ?? 1);
  await overlayText(framePath, options.outputPath, {
    text: options.title,
    fontSize: Math.round(options.preset.font.size * 0.7),
    fontColor: options.preset.brandColors.accent,
    x: `(w-text_w)/2`,
    y: `h-(h*${options.preset.safeArea.bottomPct}/100)-text_h`,
    box: true,
    boxColor: `${options.preset.brandColors.secondary}CC`,
  });
  return options.outputPath;
}
