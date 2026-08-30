import type { Asset, ContentProject, Scene } from '../domain/types.js';
import type { ChannelPreset } from '../presets/types.js';

export interface RenderPlanSceneLine {
  order: number;
  durationSec: number;
  visualAssetPath?: string;
  motion: string;
  voiceAssetPath?: string;
  caption?: string;
}

export interface RenderPlan {
  projectId: string;
  channel: string;
  scenes: RenderPlanSceneLine[];
  totalDurationSec: number;
  resolution: string;
  fps: number;
  estimatedOutputPath: string;
}

/** Builds a render plan WITHOUT executing ffmpeg — used by `content:render-plan`. */
export function buildRenderPlan(
  project: ContentProject,
  scenes: Scene[],
  assets: Asset[],
  preset: ChannelPreset,
  estimatedOutputPath: string
): RenderPlan {
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const ordered = [...scenes].sort((a, b) => a.order - b.order);

  const sceneLines: RenderPlanSceneLine[] = ordered.map((scene) => ({
    order: scene.order,
    durationSec: scene.durationMs / 1000,
    visualAssetPath: scene.assetRefs[0] ? assetById.get(scene.assetRefs[0])?.path : undefined,
    motion: scene.motion,
    voiceAssetPath: scene.voiceover ? assetById.get(scene.voiceover)?.path : undefined,
    caption: scene.caption,
  }));

  const totalDurationSec = ordered.reduce((sum, s) => sum + s.durationMs, 0) / 1000;

  return {
    projectId: project.id,
    channel: project.channel,
    scenes: sceneLines,
    totalDurationSec,
    resolution: `${preset.resolution.width}x${preset.resolution.height}`,
    fps: preset.fps,
    estimatedOutputPath,
  };
}

export function formatRenderPlan(plan: RenderPlan): string {
  const lines: string[] = [];
  for (const scene of plan.scenes) {
    lines.push(`Scene ${scene.order} → ${scene.durationSec.toFixed(1)}s`);
    lines.push(`  image: ${scene.visualAssetPath ?? '(missing)'}`);
    lines.push(`  motion: ${scene.motion}`);
    lines.push(`  voice: ${scene.voiceAssetPath ?? '(none)'}`);
    if (scene.caption) lines.push(`  caption: ${scene.caption}`);
  }
  lines.push('Final:');
  lines.push(`  ${plan.resolution}`);
  lines.push(`  ${plan.fps}fps`);
  lines.push(`  ${plan.totalDurationSec.toFixed(1)} sec`);
  lines.push(`  estimated output: ${plan.estimatedOutputPath}`);
  return lines.join('\n');
}
