import type { ContentChannelPreset, ContentProjectEnvelope } from './types.js';

export function buildRenderPlan(
  envelope: ContentProjectEnvelope,
  preset: ContentChannelPreset
): string {
  const scenes = [...envelope.scenes].sort((a, b) => a.order - b.order);
  const lines: string[] = [];
  lines.push(`Project: ${envelope.project.id}`);
  lines.push(`Title: ${envelope.project.title}`);
  lines.push(`Channel: ${envelope.project.channel}`);
  lines.push(`Preset: ${preset.channel}`);
  lines.push(`Format: ${envelope.project.format}`);
  lines.push(`Resolution: ${preset.resolution.width}x${preset.resolution.height}`);
  lines.push(`FPS: ${preset.fps}`);
  lines.push(`Scenes: ${scenes.length}`);
  lines.push('');

  let totalMs = 0;
  for (const scene of scenes) {
    totalMs += scene.durationMs;
    lines.push(`Scene ${scene.order} → ${(scene.durationMs / 1000).toFixed(1)}s`);
    lines.push(`  visual: ${scene.visualType}`);
    lines.push(`  motion: ${scene.motion}`);
    lines.push(`  caption: ${scene.caption}`);
    if (scene.voiceover) {
      lines.push(`  voice: ${scene.voiceover}`);
    }
    lines.push(`  assets: ${scene.assetRefs.join(', ') || '(none)'}`);
    lines.push('');
  }

  lines.push(`Final:`);
  lines.push(`  ${preset.resolution.width}x${preset.resolution.height}`);
  lines.push(`  ${preset.fps}fps`);
  lines.push(`  ${(totalMs / 1000).toFixed(1)} sec`);
  lines.push(`  estimated output: artifacts/content/${envelope.project.id}/final.mp4`);
  return `${lines.join('\n')}\n`;
}

