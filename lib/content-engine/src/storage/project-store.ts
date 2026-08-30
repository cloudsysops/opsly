import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { Asset, ContentProject, ContentProjectStatus, Scene } from '../domain/types.js';
import { CONTENT_PROJECT_TRANSITIONS } from '../domain/types.js';
import {
  contentTenantsRootDir,
  projectAssetsManifestPath,
  projectDir,
  projectManifestPath,
  projectScenesPath,
  tenantProjectsDir,
} from './paths.js';

export class ProjectNotFoundError extends Error {
  constructor(public readonly projectId: string) {
    super(`Content project "${projectId}" not found`);
    this.name = 'ProjectNotFoundError';
  }
}

export class InvalidStatusTransitionError extends Error {
  constructor(from: ContentProjectStatus, to: ContentProjectStatus) {
    super(`Illegal status transition: "${from}" -> "${to}"`);
    this.name = 'InvalidStatusTransitionError';
  }
}

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export function saveProject(project: ContentProject): void {
  ensureDir(projectDir(project.tenantId, project.id));
  writeFileSync(projectManifestPath(project.tenantId, project.id), JSON.stringify(project, null, 2) + '\n', 'utf8');
}

export function saveScenes(tenantId: string, projectId: string, scenes: Scene[]): void {
  ensureDir(projectDir(tenantId, projectId));
  writeFileSync(projectScenesPath(tenantId, projectId), JSON.stringify(scenes, null, 2) + '\n', 'utf8');
}

/**
 * Loads a project by id. Since a project's tenant isn't known up front from
 * just an id, this scans each tenant's projects directory under
 * data/content/tenants/*\/projects/<projectId>/project.json — fine at V1 scale
 * (dozens of projects, not millions).
 */
export function loadProject(projectId: string): ContentProject {
  const contentTenantsDir = contentTenantsRootDir();
  if (!existsSync(contentTenantsDir)) {
    throw new ProjectNotFoundError(projectId);
  }
  for (const tenantId of readdirSync(contentTenantsDir)) {
    const manifestPath = projectManifestPath(tenantId, projectId);
    if (existsSync(manifestPath)) {
      return JSON.parse(readFileSync(manifestPath, 'utf8')) as ContentProject;
    }
  }
  throw new ProjectNotFoundError(projectId);
}

export function loadScenes(tenantId: string, projectId: string): Scene[] {
  const path = projectScenesPath(tenantId, projectId);
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf8')) as Scene[];
}

export function saveAssets(tenantId: string, projectId: string, assets: Asset[]): void {
  ensureDir(projectDir(tenantId, projectId));
  writeFileSync(
    projectAssetsManifestPath(tenantId, projectId),
    JSON.stringify(assets, null, 2) + '\n',
    'utf8'
  );
}

export function loadAssets(tenantId: string, projectId: string): Asset[] {
  const path = projectAssetsManifestPath(tenantId, projectId);
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf8')) as Asset[];
}

export function listProjects(tenantId?: string): ContentProject[] {
  const contentTenantsDir = contentTenantsRootDir();
  if (!existsSync(contentTenantsDir)) return [];

  const tenants = tenantId ? [tenantId] : readdirSync(contentTenantsDir);
  const projects: ContentProject[] = [];
  for (const t of tenants) {
    const dir = tenantProjectsDir(t);
    if (!existsSync(dir)) continue;
    for (const projectId of readdirSync(dir)) {
      const manifestPath = projectManifestPath(t, projectId);
      if (existsSync(manifestPath)) {
        projects.push(JSON.parse(readFileSync(manifestPath, 'utf8')) as ContentProject);
      }
    }
  }
  return projects.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Applies a status transition, validating it against CONTENT_PROJECT_TRANSITIONS. Persists on success. */
export function transitionProjectStatus(project: ContentProject, to: ContentProjectStatus): ContentProject {
  const allowed = CONTENT_PROJECT_TRANSITIONS[project.status] ?? [];
  if (!allowed.includes(to)) {
    throw new InvalidStatusTransitionError(project.status, to);
  }
  const updated: ContentProject = { ...project, status: to, updatedAt: new Date().toISOString() };
  saveProject(updated);
  return updated;
}
