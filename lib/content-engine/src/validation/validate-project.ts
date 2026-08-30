import type { Asset, ContentProject, Scene } from '../domain/types.js';
import { assetExists } from '../storage/asset-store.js';
import { listChannels } from '../presets/index.js';

export interface ValidationIssue {
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  projectId: string;
  sceneCount: number;
  totalDurationSec: number;
  assetsResolved: number;
  assetsExpected: number;
  voiceResolved: number;
  voiceExpected: number;
  preset: string;
  readyToRender: boolean;
  issues: ValidationIssue[];
}

/**
 * Validates a project against everything content:render needs to succeed:
 * existence, tenant consistency, preset validity, scene ordering/duration,
 * asset resolution (including cross-tenant protection), and caption
 * presence. Never throws — always returns a result with `issues`.
 */
export function validateProject(project: ContentProject, scenes: Scene[], assets: Asset[]): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!project.tenantId?.trim()) {
    issues.push({ code: 'MISSING_TENANT', message: 'Project has no tenantId' });
  }

  if (!listChannels().includes(project.channel)) {
    issues.push({ code: 'UNKNOWN_CHANNEL', message: `Channel "${project.channel}" has no registered preset` });
  }

  if (scenes.length === 0) {
    issues.push({ code: 'NO_SCENES', message: 'Project has no scenes' });
  }

  const orderedScenes = [...scenes].sort((a, b) => a.order - b.order);
  const seenOrders = new Set<number>();
  for (const scene of orderedScenes) {
    if (seenOrders.has(scene.order)) {
      issues.push({ code: 'DUPLICATE_SCENE_ORDER', message: `Duplicate scene order: ${scene.order}` });
    }
    seenOrders.add(scene.order);

    if (scene.durationMs <= 0) {
      issues.push({ code: 'INVALID_SCENE_DURATION', message: `Scene ${scene.id} has non-positive duration` });
    }

    if (scene.assetRefs.length === 0) {
      issues.push({ code: 'SCENE_MISSING_ASSET', message: `Scene ${scene.id} has no visual asset` });
    }
  }

  const assetIds = new Set<string>();
  let assetsExpected = 0;
  let assetsResolved = 0;
  for (const scene of orderedScenes) {
    for (const assetId of scene.assetRefs) {
      assetsExpected += 1;
      if (assetIds.has(`${scene.id}:${assetId}`)) {
        issues.push({ code: 'DUPLICATE_ASSET_REF', message: `Scene ${scene.id} references asset "${assetId}" more than once` });
      }
      assetIds.add(`${scene.id}:${assetId}`);

      const asset = assets.find((a) => a.id === assetId);
      if (!asset) {
        issues.push({ code: 'ASSET_NOT_FOUND', message: `Scene ${scene.id} references unknown asset id "${assetId}"` });
        continue;
      }
      if (asset.tenantId !== project.tenantId) {
        issues.push({
          code: 'CROSS_TENANT_ASSET',
          message: `Scene ${scene.id}'s asset "${assetId}" belongs to tenant "${asset.tenantId}", not project tenant "${project.tenantId}"`,
        });
        continue;
      }
      if (!assetExists(asset)) {
        issues.push({ code: 'ASSET_FILE_MISSING', message: `Asset "${assetId}" (${asset.path}) does not exist on disk` });
        continue;
      }
      assetsResolved += 1;
    }
  }

  let voiceExpected = 0;
  let voiceResolved = 0;
  for (const scene of orderedScenes) {
    if (!scene.voiceover) continue;
    voiceExpected += 1;
    const asset = assets.find((a) => a.id === scene.voiceover);
    if (!asset) {
      issues.push({ code: 'VOICE_ASSET_NOT_FOUND', message: `Scene ${scene.id} references unknown voiceover asset id "${scene.voiceover}"` });
      continue;
    }
    if (asset.tenantId !== project.tenantId) {
      issues.push({
        code: 'CROSS_TENANT_ASSET',
        message: `Scene ${scene.id}'s voiceover "${scene.voiceover}" belongs to tenant "${asset.tenantId}", not project tenant "${project.tenantId}"`,
      });
      continue;
    }
    if (!assetExists(asset)) {
      issues.push({ code: 'ASSET_FILE_MISSING', message: `Voiceover asset "${scene.voiceover}" (${asset.path}) does not exist on disk` });
      continue;
    }
    voiceResolved += 1;
  }

  const totalDurationSec = orderedScenes.reduce((sum, s) => sum + s.durationMs, 0) / 1000;

  const errorCount = issues.length;
  const valid = errorCount === 0;
  const readyToRender = valid && project.status !== 'archived' && project.status !== 'published';

  return {
    valid,
    projectId: project.id,
    sceneCount: orderedScenes.length,
    totalDurationSec,
    assetsResolved,
    assetsExpected,
    voiceResolved,
    voiceExpected,
    preset: project.preset,
    readyToRender,
    issues,
  };
}

export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];
  lines.push(result.valid ? 'CONTENT_PROJECT_VALID' : 'CONTENT_PROJECT_INVALID');
  lines.push(`Scenes: ${result.sceneCount}`);
  lines.push(`Duration: ${result.totalDurationSec.toFixed(1)}s`);
  lines.push(`Assets: ${result.assetsResolved}/${result.assetsExpected}`);
  lines.push(`Voice: ${result.voiceResolved}/${result.voiceExpected}`);
  lines.push(`Preset: ${result.preset}`);
  lines.push(`Ready to render: ${result.readyToRender ? 'YES' : 'NO'}`);
  if (result.issues.length > 0) {
    lines.push('');
    lines.push('Errors:');
    for (const issue of result.issues) {
      lines.push(`  [${issue.code}] ${issue.message}`);
    }
  }
  return lines.join('\n');
}
