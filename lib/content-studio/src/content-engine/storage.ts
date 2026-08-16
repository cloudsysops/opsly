import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  ContentAsset,
  ContentProjectEnvelope,
  ContentProjectCreateInput,
  ContentProject,
  ContentScene,
  ContentRenderJob,
  ContentApproval,
  ContentMetadataExport,
  ContentChannel,
} from './types.js';
import {
  getContentArtifactsRoot,
  getContentProjectFile,
  getContentProjectRoot,
  getContentProjectArtifactsRoot,
  getContentTenantAssetsRoot,
  getContentTenantsRoot,
  getContentTenantProjectsRoot,
} from './paths.js';
import { loadContentChannelPreset } from './presets.js';
import { transitionContentProjectStatus } from './workflow.js';

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export function slugifyContentTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function defaultEpisode(tenantId: string, series: string, slug: string): string {
  return `${tenantId}-${series}-${slug}`.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').toLowerCase();
}

export function buildProjectId(input: ContentProjectCreateInput): string {
  return input.episode?.trim() || defaultEpisode(input.tenantId, input.series, slugifyContentTitle(input.title));
}

export async function createProjectEnvelope(
  input: ContentProjectCreateInput,
  baseDir = process.cwd()
): Promise<ContentProjectEnvelope> {
  const preset = input.preset ?? input.channel;
  const now = new Date().toISOString();
  const projectId = buildProjectId(input);
  const slug = slugifyContentTitle(input.title);
  const projectRoot = await getContentProjectRoot(projectId, input.tenantId, baseDir);
  const tenantAssetsRoot = await getContentTenantAssetsRoot(input.tenantId, baseDir);
  const artifactsRoot = await getContentArtifactsRoot(baseDir);
  const projectArtifactsRoot = await getContentProjectArtifactsRoot(projectId, baseDir);
  await ensureDir(projectRoot);
  await ensureDir(tenantAssetsRoot);
  await ensureDir(artifactsRoot);
  await ensureDir(projectArtifactsRoot);

  const channelPreset = await loadContentChannelPreset(preset, baseDir);

  const project: ContentProject = {
    id: projectId,
    tenantId: input.tenantId,
    channel: input.channel,
    series: input.series,
    episode: projectId,
    title: input.title,
    slug,
    goal: input.goal,
    audience: input.audience,
    format: input.format,
    status: 'idea',
    preset: channelPreset.channel,
    createdAt: now,
    updatedAt: now,
  };

  return {
    schemaVersion: 1,
    project,
    scenes: [],
    assets: [],
    renderJobs: [],
  };
}

export async function saveProjectEnvelope(
  envelope: ContentProjectEnvelope,
  baseDir = process.cwd()
): Promise<string> {
  const projectPath = await getContentProjectFile(
    envelope.project.id,
    envelope.project.tenantId,
    baseDir
  );
  await ensureDir(path.dirname(projectPath));
  await fs.writeFile(projectPath, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
  return projectPath;
}

export async function loadProjectEnvelopeByTenant(
  tenantId: string,
  projectId: string,
  baseDir = process.cwd()
): Promise<ContentProjectEnvelope> {
  const projectPath = await getContentProjectFile(projectId, tenantId, baseDir);
  const raw = await fs.readFile(projectPath, 'utf8');
  return JSON.parse(raw) as ContentProjectEnvelope;
}

export async function findProjectEnvelope(
  projectId: string,
  baseDir = process.cwd()
): Promise<ContentProjectEnvelope | null> {
  const tenantsRoot = await getContentTenantsRoot(baseDir);
  try {
    const tenantDirs = await fs.readdir(tenantsRoot, { withFileTypes: true });
    for (const tenantDir of tenantDirs) {
      if (!tenantDir.isDirectory()) continue;
      const tenantProjectFile = path.join(tenantsRoot, tenantDir.name, 'projects', projectId, 'project.json');
      try {
        const raw = await fs.readFile(tenantProjectFile, 'utf8');
        return JSON.parse(raw) as ContentProjectEnvelope;
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function listProjectEnvelopes(baseDir = process.cwd()): Promise<ContentProjectEnvelope[]> {
  const tenantsRoot = await getContentTenantsRoot(baseDir);
  try {
    const tenants = await fs.readdir(tenantsRoot, { withFileTypes: true });
    const out: ContentProjectEnvelope[] = [];
    for (const tenant of tenants) {
      if (!tenant.isDirectory()) continue;
      const projectsRoot = path.join(tenantsRoot, tenant.name, 'projects');
      const projects = await fs.readdir(projectsRoot, { withFileTypes: true }).catch(() => []);
      for (const projectDir of projects) {
        if (!projectDir.isDirectory()) continue;
        const projectPath = path.join(projectsRoot, projectDir.name, 'project.json');
        try {
          const raw = await fs.readFile(projectPath, 'utf8');
          out.push(JSON.parse(raw) as ContentProjectEnvelope);
        } catch {
          continue;
        }
      }
    }
    return out.sort((a, b) => a.project.createdAt.localeCompare(b.project.createdAt));
  } catch {
    return [];
  }
}

export async function writeAssetFromSource(options: {
  tenantId: string;
  projectId: string;
  sourcePath: string;
  type: ContentAsset['type'];
  license?: string;
  metadata?: Record<string, unknown>;
  baseDir?: string;
}): Promise<ContentAsset> {
  const baseDir = options.baseDir ?? process.cwd();
  const sourceAbs = path.resolve(baseDir, options.sourcePath);
  const bytes = await fs.readFile(sourceAbs);
  const checksum = crypto.createHash('sha256').update(bytes).digest('hex');
  const safeName = path.basename(sourceAbs).replace(/[^a-zA-Z0-9._-]/g, '_');
  const assetId = `${options.projectId}-${checksum.slice(0, 12)}`;
  const destination = path.join(
    await getContentTenantAssetsRoot(options.tenantId, baseDir),
    `${assetId}__${safeName}`
  );
  await ensureDir(path.dirname(destination));
  await fs.writeFile(destination, bytes);
  return {
    id: assetId,
    tenantId: options.tenantId,
    projectId: options.projectId,
    type: options.type,
    path: path.relative(baseDir, destination),
    source: sourceAbs,
    license: options.license ?? 'provided-by-user',
    checksum,
    metadata: options.metadata ?? {},
  };
}

export function addProjectRenderJob(
  envelope: ContentProjectEnvelope,
  job: ContentRenderJob
): ContentProjectEnvelope {
  return {
    ...envelope,
    project: {
      ...envelope.project,
      updatedAt: new Date().toISOString(),
      status:
        job.status === 'rendering'
          ? transitionContentProjectStatus(envelope.project.status, 'rendering')
          : envelope.project.status,
    },
    renderJobs: [job, ...envelope.renderJobs],
  };
}

export function setProjectApproval(
  envelope: ContentProjectEnvelope,
  approval: ContentApproval
): ContentProjectEnvelope {
  return {
    ...envelope,
    project: {
      ...envelope.project,
      status:
        approval.state === 'approved'
          ? transitionContentProjectStatus(envelope.project.status, 'approved')
          : approval.state === 'rejected'
            ? 'failed'
            : transitionContentProjectStatus(envelope.project.status, 'ready_for_review'),
      approvedBy: approval.approvedBy,
      approvedAt: approval.approvedAt,
      reviewNotes: approval.reviewNotes,
      updatedAt: new Date().toISOString(),
    },
    approval,
  };
}

export function setProjectMetadata(
  envelope: ContentProjectEnvelope,
  metadata: ContentMetadataExport
): ContentProjectEnvelope {
  return {
    ...envelope,
    metadata,
    project: {
      ...envelope.project,
      updatedAt: new Date().toISOString(),
    },
  };
}
