import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// lib/content-engine/(src|dist)/storage -> repo root
const COMPUTED_REPO_ROOT = resolve(join(__dirname, '../../../..'));

/**
 * Storage root override for tests — points content/ and artifacts/ at an
 * isolated tmp directory instead of the real repo tree. Never set outside
 * test setup.
 */
export function repoRoot(): string {
  return process.env.CONTENT_ENGINE_ROOT_OVERRIDE ?? COMPUTED_REPO_ROOT;
}

function currentRoot(): string {
  return repoRoot();
}

/** data/content/tenants — parent of every tenant's isolated content directory. */
export function contentTenantsRootDir(): string {
  return join(currentRoot(), 'data', 'content', 'tenants');
}

/** data/content/tenants/<tenant>/projects — source-of-truth project definitions. */
export function tenantProjectsDir(tenantId: string): string {
  return join(currentRoot(), 'data', 'content', 'tenants', tenantId, 'projects');
}

/** data/content/tenants/<tenant>/assets — source assets (images/voice/music/etc). */
export function tenantAssetsDir(tenantId: string): string {
  return join(currentRoot(), 'data', 'content', 'tenants', tenantId, 'assets');
}

export function projectDir(tenantId: string, projectId: string): string {
  return join(tenantProjectsDir(tenantId), projectId);
}

export function projectManifestPath(tenantId: string, projectId: string): string {
  return join(projectDir(tenantId, projectId), 'project.json');
}

export function projectScenesPath(tenantId: string, projectId: string): string {
  return join(projectDir(tenantId, projectId), 'scenes.json');
}

export function projectAssetsManifestPath(tenantId: string, projectId: string): string {
  return join(projectDir(tenantId, projectId), 'assets.json');
}

/** runtime/content-artifacts/<projectId> — build outputs (final.mp4, thumbnail.jpg, captions.srt, ...). */
export function artifactsDir(projectId: string): string {
  return join(currentRoot(), 'runtime', 'content-artifacts', projectId);
}

export function finalVideoPath(projectId: string): string {
  return join(artifactsDir(projectId), 'final.mp4');
}

export function captionsPath(projectId: string): string {
  return join(artifactsDir(projectId), 'captions.srt');
}

export function thumbnailPath(projectId: string): string {
  return join(artifactsDir(projectId), 'thumbnail.jpg');
}

export function metadataPath(projectId: string): string {
  return join(artifactsDir(projectId), 'metadata.json');
}

export function sceneClipPath(projectId: string, sceneOrder: number): string {
  return join(artifactsDir(projectId), 'tmp', `scene-${String(sceneOrder).padStart(2, '0')}.mp4`);
}

/**
 * Resolves an asset's project-relative path to an absolute path, and throws
 * if the resolved path escapes the tenant's own asset directory — the one
 * hard rule that keeps tenant content isolated (see GOVERNANCE.md).
 */
export function resolveAssetPath(tenantId: string, relativePath: string): string {
  const root = tenantAssetsDir(tenantId);
  const resolved = resolve(join(root, relativePath));
  if (resolved !== root && !resolved.startsWith(root + '/')) {
    throw new Error(
      `Asset path "${relativePath}" resolves outside tenant "${tenantId}"'s asset directory (cross-tenant access blocked)`
    );
  }
  return resolved;
}
