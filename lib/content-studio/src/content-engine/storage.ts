import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  ContentAsset,
  ContentProjectEnvelope,
  ContentProjectCreateInput,
  ContentProject,
  ContentRenderJob,
  ContentApproval,
  ContentMetadataExport,
  ContentProvenance,
} from './types.js';
import {
  getContentArtifactsRoot,
  getContentProjectFile,
  getContentProjectRoot,
  getContentProjectArtifactsRoot,
  getContentTenantAssetsRoot,
  getContentTenantsRoot,
} from './paths.js';
import { brandKitFromPreset, loadContentChannelPreset } from './presets.js';

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
  await ensureDir(getContentProjectRoot(projectId, input.tenantId, baseDir));
  await ensureDir(getContentTenantAssetsRoot(input.tenantId, baseDir));
  await ensureDir(getContentArtifactsRoot(baseDir));
  await ensureDir(getContentProjectArtifactsRoot(projectId, baseDir));
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
    mode: input.mode ?? 'original',
    portal: input.portal,
    formatTemplate: input.formatTemplate,
    question: input.question,
    emotion: input.emotion,
    learningGoal: input.learningGoal,
    createdAt: now,
    updatedAt: now,
  };
  return {
    schemaVersion: 2,
    project,
    scenes: [],
    assets: [],
    renderJobs: [],
    brandKit: brandKitFromPreset(channelPreset),
  };
}

export async function saveProjectEnvelope(
  envelope: ContentProjectEnvelope,
  baseDir = process.cwd()
): Promise<string> {
  const projectPath = getContentProjectFile(envelope.project.id, envelope.project.tenantId, baseDir);
  await ensureDir(path.dirname(projectPath));
  await fs.writeFile(projectPath, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
  return projectPath;
}

export async function loadProjectEnvelopeByTenant(
  tenantId: string,
  projectId: string,
  baseDir = process.cwd()
): Promise<ContentProjectEnvelope> {
  const raw = await fs.readFile(getContentProjectFile(projectId, tenantId, baseDir), 'utf8');
  return JSON.parse(raw) as ContentProjectEnvelope;
}

export async function listProjectEnvelopes(
  baseDir = process.cwd(),
  tenantId?: string
): Promise<ContentProjectEnvelope[]> {
  const tenantsRoot = getContentTenantsRoot(baseDir);
  try {
    const tenantNames = tenantId ? [tenantId] : (await fs.readdir(tenantsRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    const out: ContentProjectEnvelope[] = [];
    for (const tenant of tenantNames) {
      const projectsRoot = path.join(tenantsRoot, tenant, 'projects');
      const projects = await fs.readdir(projectsRoot, { withFileTypes: true }).catch(() => []);
      for (const projectDir of projects) {
        if (!projectDir.isDirectory()) continue;
        try {
          const raw = await fs.readFile(path.join(projectsRoot, projectDir.name, 'project.json'), 'utf8');
          const envelope = JSON.parse(raw) as ContentProjectEnvelope;
          if (envelope.project.tenantId === tenant) {
            out.push(envelope);
          }
        } catch {
          continue;
        }
      }
    }
    return out.sort((a, b) => a.project.updatedAt.localeCompare(b.project.updatedAt));
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
  provenance?: ContentProvenance;
  metadata?: Record<string, unknown>;
  baseDir?: string;
}): Promise<ContentAsset> {
  const baseDir = options.baseDir ?? process.cwd();
  const sourceAbs = path.resolve(baseDir, options.sourcePath);
  const bytes = await fs.readFile(sourceAbs);
  const checksum = crypto.createHash('sha256').update(bytes).digest('hex');
  const safeName = path.basename(sourceAbs).replace(/[^a-zA-Z0-9._-]/g, '_');
  const assetId = `${options.projectId}-${checksum.slice(0, 12)}`;
  const destination = path.join(getContentTenantAssetsRoot(options.tenantId, baseDir), `${assetId}__${safeName}`);
  await ensureDir(path.dirname(destination));
  await fs.writeFile(destination, bytes);
  const sidecarSrc = `${sourceAbs}.transcript.json`;
  if (existsSync(sidecarSrc)) {
    await fs.copyFile(sidecarSrc, `${destination}.transcript.json`);
  }
  return {
    id: assetId,
    tenantId: options.tenantId,
    projectId: options.projectId,
    type: options.type,
    path: path.relative(baseDir, destination),
    source: sourceAbs,
    license: options.license ?? options.provenance?.license ?? 'provided-by-user',
    checksum,
    metadata: options.metadata ?? {},
    provenance: options.provenance,
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
      status: job.status === 'rendering' ? 'rendering' : envelope.project.status,
    },
    renderJobs: [job, ...envelope.renderJobs],
  };
}

export function setProjectApproval(
  envelope: ContentProjectEnvelope,
  approval: ContentApproval
): ContentProjectEnvelope {
  const status =
    approval.state === 'approved'
      ? 'approved'
      : approval.state === 'rejected'
        ? 'failed'
        : 'human_review';
  return {
    ...envelope,
    project: {
      ...envelope.project,
      status,
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
    project: { ...envelope.project, updatedAt: new Date().toISOString() },
  };
}

export function assertSameTenant(envelope: ContentProjectEnvelope, tenantId: string): void {
  if (envelope.project.tenantId !== tenantId) {
    throw new Error(`TENANT_ISOLATION: project ${envelope.project.id} belongs to ${envelope.project.tenantId}`);
  }
}
