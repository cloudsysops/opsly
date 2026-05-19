import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

import {
  BranchRegistryEntrySchema,
  type BranchRegistryEntry,
} from './types.js';

interface TenantRegistryFile {
  tenant_slug: string;
  next_job_sequence: number;
  entries: BranchRegistryEntry[];
}

const memoryByTenant = new Map<string, BranchRegistryEntry[]>();

/** Serializes allocateJobId per tenant within this process (avoids duplicate job-* ids). */
const allocateChains = new Map<string, Promise<unknown>>();

async function withTenantAllocateLock<T>(
  tenantSlug: string,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = allocateChains.get(tenantSlug) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chain = previous.then(() => gate);
  allocateChains.set(tenantSlug, chain);
  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (allocateChains.get(tenantSlug) === chain) {
      allocateChains.delete(tenantSlug);
    }
  }
}
function registryDir(root: string): string {
  return join(root, 'runtime', 'branch-registry');
}

function registryPath(root: string, tenantSlug: string): string {
  return join(registryDir(root), `${tenantSlug}.json`);
}

function findRepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, 'config', 'git-branch-policy.json'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

export function resolveRepoRoot(): string {
  const fromEnv = process.env.OPSLY_ROOT?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return findRepoRoot(process.cwd());
}

async function loadFile(root: string, tenantSlug: string): Promise<TenantRegistryFile> {
  const path = registryPath(root, tenantSlug);
  if (!existsSync(path)) {
    return { tenant_slug: tenantSlug, next_job_sequence: 100, entries: [] };
  }
  const raw = await readFile(path, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  const data = parsed as TenantRegistryFile;
  return {
    tenant_slug: tenantSlug,
    next_job_sequence: data.next_job_sequence ?? 100,
    entries: (data.entries ?? []).map((e) => BranchRegistryEntrySchema.parse(e)),
  };
}

async function saveFile(root: string, file: TenantRegistryFile): Promise<void> {
  const dir = registryDir(root);
  await mkdir(dir, { recursive: true });
  const path = registryPath(root, file.tenant_slug);
  await writeFile(path, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
  memoryByTenant.set(file.tenant_slug, file.entries);
}

export async function listBranchEntries(
  tenantSlug: string,
  root?: string,
): Promise<BranchRegistryEntry[]> {
  const mem = memoryByTenant.get(tenantSlug);
  if (mem) {
    return [...mem];
  }
  const repoRoot = root ?? resolveRepoRoot();
  const file = await loadFile(repoRoot, tenantSlug);
  memoryByTenant.set(tenantSlug, file.entries);
  return [...file.entries];
}

export async function getBranchEntry(
  tenantSlug: string,
  id: string,
  root?: string,
): Promise<BranchRegistryEntry | null> {
  const entries = await listBranchEntries(tenantSlug, root);
  return entries.find((e) => e.id === id) ?? null;
}

export async function getBranchByName(
  tenantSlug: string,
  branchName: string,
  root?: string,
): Promise<BranchRegistryEntry | null> {
  const entries = await listBranchEntries(tenantSlug, root);
  return entries.find((e) => e.branch_name === branchName) ?? null;
}

export async function allocateJobId(tenantSlug: string, root?: string): Promise<string> {
  return withTenantAllocateLock(tenantSlug, async () => {
    const repoRoot = root ?? resolveRepoRoot();
    const file = await loadFile(repoRoot, tenantSlug);
    const seq = file.next_job_sequence;
    file.next_job_sequence = seq + 1;
    await saveFile(repoRoot, file);
    return `job-${seq}`;
  });
}

export async function upsertBranchEntry(
  entry: BranchRegistryEntry,
  root?: string,
): Promise<BranchRegistryEntry> {
  const validated = BranchRegistryEntrySchema.parse(entry);
  const repoRoot = root ?? resolveRepoRoot();
  const file = await loadFile(repoRoot, validated.tenant_slug);
  const idx = file.entries.findIndex((e) => e.id === validated.id);
  if (idx >= 0) {
    file.entries[idx] = validated;
  } else {
    file.entries.push(validated);
  }
  await saveFile(repoRoot, file);
  return validated;
}

export function createRegistryEntry(input: {
  tenant_slug: string;
  branch_name: string;
  job_id: string;
  worker_id: string;
  worker_branch_slug: string;
  task_slug: string;
  task_type: string;
  title?: string;
  parent_branch: string;
  target_branch: string;
  integration_branch: string;
  initiative: string;
  risk_level: 'low' | 'medium' | 'high';
  status?: BranchRegistryEntry['status'];
  session_id?: string;
  request_id?: string;
}): BranchRegistryEntry {
  const now = new Date().toISOString();
  return BranchRegistryEntrySchema.parse({
    id: randomUUID(),
    tenant_slug: input.tenant_slug,
    branch_name: input.branch_name,
    job_id: input.job_id,
    worker_id: input.worker_id,
    worker_branch_slug: input.worker_branch_slug,
    task_slug: input.task_slug,
    task_type: input.task_type,
    title: input.title,
    parent_branch: input.parent_branch,
    target_branch: input.target_branch,
    integration_branch: input.integration_branch,
    initiative: input.initiative,
    status: input.status ?? 'planned',
    risk_level: input.risk_level,
    session_id: input.session_id,
    request_id: input.request_id,
    test_status: 'unknown',
    files_touched: [],
    created_at: now,
    updated_at: now,
  });
}

export async function updateBranchEntry(
  tenantSlug: string,
  id: string,
  patch: Partial<BranchRegistryEntry>,
  root?: string,
): Promise<BranchRegistryEntry | null> {
  const existing = await getBranchEntry(tenantSlug, id, root);
  if (!existing) {
    return null;
  }
  const updated = BranchRegistryEntrySchema.parse({
    ...existing,
    ...patch,
    id: existing.id,
    tenant_slug: existing.tenant_slug,
    updated_at: new Date().toISOString(),
  });
  return upsertBranchEntry(updated, root);
}
