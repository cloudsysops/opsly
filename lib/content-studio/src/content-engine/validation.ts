import path from 'node:path';
import fs from 'node:fs/promises';
import { ContentProjectEnvelope, ContentScene } from './types.js';
import { getContentTenantAssetsRoot } from './paths.js';

export interface ContentValidationIssue {
  code: string;
  message: string;
}

export interface ContentValidationResult {
  valid: boolean;
  errors: ContentValidationIssue[];
  warnings: ContentValidationIssue[];
  summary: {
    scenes: number;
    durationSeconds: number;
    assets: number;
    voice: number;
    preset: string;
    readyToRender: boolean;
  };
}

function issue(code: string, message: string): ContentValidationIssue {
  return { code, message };
}

function sortScenes(scenes: ContentScene[]): ContentScene[] {
  return [...scenes].sort((a, b) => a.order - b.order);
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function validateContentProject(
  envelope: ContentProjectEnvelope,
  baseDir = process.cwd()
): Promise<ContentValidationResult> {
  const errors: ContentValidationIssue[] = [];
  const warnings: ContentValidationIssue[] = [];
  const scenes = sortScenes(envelope.scenes);
  const project = envelope.project;
  const assetById = new Map(envelope.assets.map((asset) => [asset.id, asset]));
  const projectAssetRoot = getContentTenantAssetsRoot(project.tenantId, baseDir);
  const projectAssetPrefixes = [
    path.relative(baseDir, projectAssetRoot).replace(/\\/g, '/'),
    `content/tenants/${project.tenantId}/assets`,
  ];

  if (scenes.length === 0) {
    errors.push(issue('SCENES_EMPTY', 'Project has no scenes'));
  }

  const seenOrders = new Set<number>();
  scenes.forEach((scene, index) => {
    if (scene.projectId !== project.id) {
      errors.push(issue('SCENE_PROJECT_MISMATCH', `Scene ${scene.id} does not belong to project ${project.id}`));
    }
    if (seenOrders.has(scene.order)) {
      errors.push(issue('SCENE_DUPLICATE_ORDER', `Duplicate scene order ${scene.order}`));
    }
    seenOrders.add(scene.order);
    if (scene.order !== index + 1) {
      warnings.push(issue('SCENE_ORDER_GAP', `Scene ${scene.id} has order ${scene.order}; expected ${index + 1}`));
    }
    if (scene.durationMs <= 0) {
      errors.push(issue('SCENE_DURATION_INVALID', `Scene ${scene.id} duration must be positive`));
    }
    if (!scene.caption.trim()) {
      errors.push(issue('SCENE_CAPTION_EMPTY', `Scene ${scene.id} caption is required`));
    }
    for (const assetRef of scene.assetRefs) {
      const asset = assetById.get(assetRef);
      if (!asset) {
        errors.push(issue('ASSET_MISSING', `Scene ${scene.id} references missing asset ${assetRef}`));
        continue;
      }
      if (asset.projectId !== project.id) {
        errors.push(issue('ASSET_CROSS_PROJECT', `Asset ${asset.id} belongs to another project`));
      }
      if (asset.tenantId !== project.tenantId) {
        errors.push(issue('ASSET_CROSS_TENANT', `Asset ${asset.id} belongs to another tenant`));
      }
      const normalized = asset.path.replace(/\\/g, '/');
      const isTenantAsset = projectAssetPrefixes.some((prefix) => normalized.startsWith(prefix));
      if (!isTenantAsset) {
        warnings.push(issue('ASSET_PATH_EXTERNAL', `Asset ${asset.id} is stored outside tenant asset root`));
      }
    }
  });

  for (const asset of envelope.assets) {
    if (!(await exists(path.resolve(baseDir, asset.path)))) {
      errors.push(issue('ASSET_PATH_MISSING', `Asset file not found: ${asset.path}`));
    }
  }

  const durationSeconds = scenes.reduce((sum, scene) => sum + scene.durationMs / 1000, 0);
  const voice = scenes.filter((scene) => Boolean(scene.voiceover?.trim())).length;
  const readyToRender =
    errors.length === 0 &&
    scenes.length > 0 &&
    scenes.every((scene) => scene.assetRefs.length > 0) &&
    envelope.project.status !== 'failed';

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      scenes: scenes.length,
      durationSeconds: Number(durationSeconds.toFixed(1)),
      assets: envelope.assets.length,
      voice,
      preset: envelope.project.preset,
      readyToRender,
    },
  };
}

export function assertContentProjectReady(result: ContentValidationResult): void {
  if (!result.valid) {
    const errorText = result.errors.map((item) => `${item.code}: ${item.message}`).join('\n');
    throw new Error(`CONTENT_PROJECT_INVALID\n${errorText}`);
  }
}

