import path from 'node:path';
import fs from 'node:fs/promises';

export async function resolveRepoRoot(startDir = process.cwd()): Promise<string> {
  let current = path.resolve(startDir);
  while (true) {
    const workspaceFile = path.join(current, 'pnpm-workspace.yaml');
    const gitDir = path.join(current, '.git');
    try {
      await fs.access(workspaceFile);
      return current;
    } catch {}
    try {
      await fs.access(gitDir);
      return current;
    } catch {}
    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }
    current = parent;
  }
}

export async function getContentRoot(baseDir = process.cwd()): Promise<string> {
  return path.join(await resolveRepoRoot(baseDir), 'content');
}

export async function getContentTenantsRoot(baseDir = process.cwd()): Promise<string> {
  return path.join(await getContentRoot(baseDir), 'tenants');
}

export async function getContentTenantRoot(tenantId: string, baseDir = process.cwd()): Promise<string> {
  return path.join(await getContentTenantsRoot(baseDir), tenantId);
}

export async function getContentTenantProjectsRoot(tenantId: string, baseDir = process.cwd()): Promise<string> {
  return path.join(await getContentTenantRoot(tenantId, baseDir), 'projects');
}

export async function getContentTenantAssetsRoot(tenantId: string, baseDir = process.cwd()): Promise<string> {
  return path.join(await getContentTenantRoot(tenantId, baseDir), 'assets');
}

export async function getContentProjectRoot(projectId: string, tenantId: string, baseDir = process.cwd()): Promise<string> {
  return path.join(await getContentTenantProjectsRoot(tenantId, baseDir), projectId);
}

export async function getContentProjectFile(projectId: string, tenantId: string, baseDir = process.cwd()): Promise<string> {
  return path.join(await getContentProjectRoot(projectId, tenantId, baseDir), 'project.json');
}

export async function getContentArtifactsRoot(baseDir = process.cwd()): Promise<string> {
  return path.join(await resolveRepoRoot(baseDir), 'artifacts', 'content');
}

export async function getContentProjectArtifactsRoot(projectId: string, baseDir = process.cwd()): Promise<string> {
  return path.join(await getContentArtifactsRoot(baseDir), projectId);
}

export async function getContentProjectWorkingRoot(projectId: string, tenantId: string, baseDir = process.cwd()): Promise<string> {
  return path.join(await getContentProjectRoot(projectId, tenantId, baseDir), 'working');
}
