import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validateProject, formatValidationResult } from '../validation/validate-project.js';
import { tenantAssetsDir } from '../storage/paths.js';
import type { Asset, ContentProject, Scene } from '../domain/types.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'content-engine-validate-test-'));
  process.env.CONTENT_ENGINE_ROOT_OVERRIDE = root;
});

afterEach(() => {
  delete process.env.CONTENT_ENGINE_ROOT_OVERRIDE;
  rmSync(root, { recursive: true, force: true });
});

function baseProject(overrides: Partial<ContentProject> = {}): ContentProject {
  const now = new Date().toISOString();
  return {
    id: 'p1',
    tenantId: 'tenant-a',
    channel: 'opsly-universe',
    series: 'test-series',
    episode: 1,
    title: 'Test',
    slug: 'test',
    goal: '',
    audience: '',
    format: '9:16',
    status: 'assets_pending',
    preset: 'opsly-universe',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeAssetFile(tenantId: string, relativePath: string): void {
  const fullPath = join(tenantAssetsDir(tenantId), relativePath);
  mkdirSync(join(fullPath, '..'), { recursive: true });
  writeFileSync(fullPath, 'fake-image-bytes', 'utf8');
}

function scene(order: number, assetRefs: string[], voiceover?: string): Scene {
  return {
    id: `scene_${order}`,
    projectId: 'p1',
    order,
    durationMs: 2000,
    visualType: 'image',
    assetRefs,
    voiceover,
    transition: 'cut',
    motion: 'static',
  };
}

function asset(id: string, tenantId: string, path: string, type: Asset['type'] = 'image'): Asset {
  return { id, tenantId, projectId: 'p1', type, path, source: 'manual', license: 'x', checksum: 'x', metadata: {} };
}

describe('validateProject', () => {
  it('passes for a well-formed project with resolvable assets', () => {
    makeAssetFile('tenant-a', 'scene-01.png');
    const project = baseProject();
    const scenes = [scene(1, ['a1'])];
    const assets = [asset('a1', 'tenant-a', 'scene-01.png')];
    const result = validateProject(project, scenes, assets);
    expect(result.valid).toBe(true);
    expect(result.readyToRender).toBe(true);
    expect(result.assetsResolved).toBe(1);
  });

  it('flags a project with no scenes', () => {
    const result = validateProject(baseProject(), [], []);
    expect(result.valid).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain('NO_SCENES');
  });

  it('flags duplicate scene order values', () => {
    makeAssetFile('tenant-a', 'a.png');
    const scenes = [scene(1, ['a1']), scene(1, ['a1'])];
    const assets = [asset('a1', 'tenant-a', 'a.png')];
    const result = validateProject(baseProject(), scenes, assets);
    expect(result.issues.map((i) => i.code)).toContain('DUPLICATE_SCENE_ORDER');
  });

  it('flags a scene with no visual asset', () => {
    const result = validateProject(baseProject(), [scene(1, [])], []);
    expect(result.issues.map((i) => i.code)).toContain('SCENE_MISSING_ASSET');
  });

  it('flags a reference to an asset id that does not exist in the manifest', () => {
    const result = validateProject(baseProject(), [scene(1, ['ghost'])], []);
    expect(result.issues.map((i) => i.code)).toContain('ASSET_NOT_FOUND');
  });

  it('flags a cross-tenant asset reference', () => {
    makeAssetFile('tenant-b', 'a.png');
    const scenes = [scene(1, ['a1'])];
    const assets = [asset('a1', 'tenant-b', 'a.png')]; // wrong tenant vs project's tenant-a
    const result = validateProject(baseProject(), scenes, assets);
    expect(result.issues.map((i) => i.code)).toContain('CROSS_TENANT_ASSET');
  });

  it('flags an asset that is registered but missing on disk', () => {
    const scenes = [scene(1, ['a1'])];
    const assets = [asset('a1', 'tenant-a', 'does-not-exist.png')];
    const result = validateProject(baseProject(), scenes, assets);
    expect(result.issues.map((i) => i.code)).toContain('ASSET_FILE_MISSING');
  });

  it('flags an unresolvable voiceover reference separately from visual assets', () => {
    makeAssetFile('tenant-a', 'a.png');
    const scenes = [scene(1, ['a1'], 'ghost-voice')];
    const assets = [asset('a1', 'tenant-a', 'a.png')];
    const result = validateProject(baseProject(), scenes, assets);
    expect(result.issues.map((i) => i.code)).toContain('VOICE_ASSET_NOT_FOUND');
    expect(result.voiceExpected).toBe(1);
    expect(result.voiceResolved).toBe(0);
  });

  it('is not readyToRender for an archived project even if otherwise valid', () => {
    makeAssetFile('tenant-a', 'a.png');
    const project = baseProject({ status: 'archived' });
    const scenes = [scene(1, ['a1'])];
    const assets = [asset('a1', 'tenant-a', 'a.png')];
    const result = validateProject(project, scenes, assets);
    expect(result.valid).toBe(true);
    expect(result.readyToRender).toBe(false);
  });

  it('flags an unregistered channel', () => {
    const project = baseProject({ channel: 'not-a-channel' as ContentProject['channel'] });
    const result = validateProject(project, [scene(1, ['a1'])], []);
    expect(result.issues.map((i) => i.code)).toContain('UNKNOWN_CHANNEL');
  });

  it('formats a valid result as CONTENT_PROJECT_VALID with counts', () => {
    makeAssetFile('tenant-a', 'a.png');
    const scenes = [scene(1, ['a1'])];
    const assets = [asset('a1', 'tenant-a', 'a.png')];
    const result = validateProject(baseProject(), scenes, assets);
    const formatted = formatValidationResult(result);
    expect(formatted).toContain('CONTENT_PROJECT_VALID');
    expect(formatted).toContain('Scenes: 1');
    expect(formatted).toContain('Ready to render: YES');
  });

  it('formats an invalid result as CONTENT_PROJECT_INVALID with error lines', () => {
    const result = validateProject(baseProject(), [], []);
    const formatted = formatValidationResult(result);
    expect(formatted).toContain('CONTENT_PROJECT_INVALID');
    expect(formatted).toContain('[NO_SCENES]');
  });
});
