import fs from 'node:fs';
import path from 'node:path';

export function resolveRepoRoot(startDir = process.cwd()): string {
  let current = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(current, 'config', 'content-channels'))) {
      return current;
    }
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml')) || fs.existsSync(path.join(current, '.git'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }
    current = parent;
  }
}

export function getContentRoot(baseDir = process.cwd()): string {
  return path.join(resolveRepoRoot(baseDir), 'runtime', 'content-os');
}

export function getContentTenantsRoot(baseDir = process.cwd()): string {
  return path.join(getContentRoot(baseDir), 'tenants');
}

export function getContentTenantRoot(tenantId: string, baseDir = process.cwd()): string {
  return path.join(getContentTenantsRoot(baseDir), tenantId);
}

export function getContentTenantProjectsRoot(tenantId: string, baseDir = process.cwd()): string {
  return path.join(getContentTenantRoot(tenantId, baseDir), 'projects');
}

export function getContentTenantAssetsRoot(tenantId: string, baseDir = process.cwd()): string {
  return path.join(getContentTenantRoot(tenantId, baseDir), 'assets');
}

export function getContentProjectRoot(projectId: string, tenantId: string, baseDir = process.cwd()): string {
  return path.join(getContentTenantProjectsRoot(tenantId, baseDir), projectId);
}

export function getContentProjectFile(projectId: string, tenantId: string, baseDir = process.cwd()): string {
  return path.join(getContentProjectRoot(projectId, tenantId, baseDir), 'project.json');
}

export function getContentArtifactsRoot(baseDir = process.cwd()): string {
  return path.join(getContentRoot(baseDir), 'artifacts');
}

export function getContentProjectArtifactsRoot(projectId: string, baseDir = process.cwd()): string {
  return path.join(getContentArtifactsRoot(baseDir), projectId);
}

export function getContentProjectWorkingRoot(
  projectId: string,
  tenantId: string,
  baseDir = process.cwd()
): string {
  return path.join(getContentProjectRoot(projectId, tenantId, baseDir), 'working');
}
