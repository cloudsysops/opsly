import fs from 'node:fs/promises';
import path from 'node:path';

type ContentProjectFile = {
  project: {
    id: string;
    tenantId: string;
    channel: string;
    series: string;
    title: string;
    status: string;
    preset: string;
    updatedAt?: string;
  };
  scenes: Array<{
    id: string;
    order: number;
    durationMs: number;
    visualType: string;
    caption: string;
    motion: string;
    assetRefs: string[];
  }>;
  assets: Array<{
    id: string;
    type: string;
    path: string;
  }>;
  renderJobs?: Array<{
    id: string;
    status: string;
    outputPath?: string;
    startedAt?: string;
    completedAt?: string;
  }>;
};

export type ContentProjectSummary = {
  id: string;
  tenantId: string;
  channel: string;
  series: string;
  title: string;
  status: string;
  preset: string;
  updatedAt: string;
  sceneCount: number;
  durationSec: number;
  assetCount: number;
  finalPath: string;
  thumbnailPath: string;
  captionsPath: string;
  metadataPath: string;
};

export type ContentProjectDetail = ContentProjectSummary & {
  scenes: ContentProjectFile['scenes'];
  assets: ContentProjectFile['assets'];
  renderJobs: ContentProjectFile['renderJobs'];
};

function repoRoot(): string {
  return path.resolve(process.cwd(), '..', '..');
}

function contentRoot(): string {
  return path.join(repoRoot(), 'content', 'tenants');
}

function artifactsRoot(): string {
  return path.join(repoRoot(), 'artifacts', 'content');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function listProjectJsonPaths(): Promise<string[]> {
  const tenants = await fs.readdir(contentRoot(), { withFileTypes: true }).catch(() => []);
  const projectPaths: string[] = [];
  for (const tenant of tenants) {
    if (!tenant.isDirectory()) continue;
    const projectsDir = path.join(contentRoot(), tenant.name, 'projects');
    const projects = await fs.readdir(projectsDir, { withFileTypes: true }).catch(() => []);
    for (const project of projects) {
      if (!project.isDirectory()) continue;
      projectPaths.push(path.join(projectsDir, project.name, 'project.json'));
    }
  }
  return projectPaths;
}

function buildSummary(file: ContentProjectFile, projectDir: string): ContentProjectSummary {
  const finalPath = path.join(artifactsRoot(), file.project.id, 'final.mp4');
  const thumbnailPath = path.join(artifactsRoot(), file.project.id, 'thumbnail.jpg');
  const captionsPath = path.join(artifactsRoot(), file.project.id, 'captions.srt');
  const metadataPath = path.join(artifactsRoot(), file.project.id, 'metadata.json');
  const durationSec = Number((file.scenes.reduce((acc, scene) => acc + scene.durationMs, 0) / 1000).toFixed(1));
  return {
    id: file.project.id,
    tenantId: file.project.tenantId,
    channel: file.project.channel,
    series: file.project.series,
    title: file.project.title,
    status: file.project.status,
    preset: file.project.preset,
    updatedAt: file.project.updatedAt ?? new Date().toISOString(),
    sceneCount: file.scenes.length,
    durationSec,
    assetCount: file.assets.length,
    finalPath,
    thumbnailPath,
    captionsPath,
    metadataPath,
  };
}

export async function listContentProjects(): Promise<ContentProjectSummary[]> {
  const projectPaths = await listProjectJsonPaths();
  const summaries = await Promise.all(
    projectPaths.map(async (projectPath) => {
      const file = await readJsonFile<ContentProjectFile>(projectPath);
      return file ? buildSummary(file, path.dirname(projectPath)) : null;
    })
  );
  return summaries.filter((value): value is ContentProjectSummary => Boolean(value));
}

export async function loadContentProject(projectId: string): Promise<ContentProjectDetail | null> {
  const projectPaths = await listProjectJsonPaths();
  for (const projectPath of projectPaths) {
    const file = await readJsonFile<ContentProjectFile>(projectPath);
    if (!file || file.project.id !== projectId) continue;
    const summary = buildSummary(file, path.dirname(projectPath));
    return {
      ...summary,
      scenes: file.scenes,
      assets: file.assets,
      renderJobs: file.renderJobs ?? [],
    };
  }
  return null;
}

export async function projectAssetsExist(projectId: string): Promise<boolean> {
  return fileExists(path.join(artifactsRoot(), projectId, 'final.mp4'));
}
