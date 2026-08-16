import type { ContentAsset, ContentAssetType, ContentChannel, ContentFormat, ContentGoal, ContentMotion, ContentVisualType, ContentProjectCreateInput, ContentProjectEnvelope } from './types.js';
import { createProjectEnvelope, writeAssetFromSource } from './storage.js';

export interface ContentStoryAssetInput {
  key: string;
  sourcePath: string;
  type: ContentAssetType;
  license?: string;
  metadata?: Record<string, unknown>;
}

export interface ContentStorySceneInput {
  id: string;
  order: number;
  durationMs: number;
  visualType: ContentVisualType;
  assetRefs: string[];
  voiceover?: string;
  caption: string;
  transition: 'cut' | 'fade' | 'dissolve' | 'wipe' | 'zoom';
  motion: ContentMotion;
  narration?: string;
}

export interface ContentStoryInput {
  project: ContentProjectCreateInput;
  assets: ContentStoryAssetInput[];
  scenes: ContentStorySceneInput[];
}

export interface ContentStoryCreationResult {
  envelope: ContentProjectEnvelope;
  assetMap: Record<string, ContentAsset>;
}

export async function createProjectFromStory(
  story: ContentStoryInput,
  baseDir = process.cwd()
): Promise<ContentStoryCreationResult> {
  const envelope = await createProjectEnvelope(story.project, baseDir);
  const assetMap: Record<string, ContentAsset> = {};

  for (const asset of story.assets) {
    const created = await writeAssetFromSource({
      tenantId: story.project.tenantId,
      projectId: envelope.project.id,
      sourcePath: asset.sourcePath,
      type: asset.type,
      license: asset.license,
      metadata: asset.metadata,
      baseDir,
    });
    envelope.assets.push(created);
    assetMap[asset.key] = created;
  }

  envelope.scenes.push(
    ...story.scenes
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((scene) => ({
        ...scene,
        projectId: envelope.project.id,
        assetRefs: scene.assetRefs.map((ref) => assetMap[ref]?.id ?? ref),
      }))
  );

  envelope.project.status = envelope.scenes.length > 0 ? 'drafting' : 'idea';
  return { envelope, assetMap };
}
