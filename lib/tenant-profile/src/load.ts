import { readdir, readFile } from 'node:fs/promises';

import { resolveRepoPath } from './repo-root.js';
import type { TenantProfile } from './types.js';

async function readJsonFileOrNull<T>(...segments: string[]): Promise<T | null> {
  try {
    const raw = await readFile(resolveRepoPath(...segments), 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isTenantConfigFile(name: string): boolean {
  return (
    name.endsWith('.json') &&
    name !== 'schema.tenant-config.json' &&
    !name.startsWith('_template')
  );
}

/** Load one tenant profile from config/tenants/{slug}.json */
export async function loadTenantProfile(slug: string): Promise<TenantProfile | null> {
  const normalized = slug.trim().toLowerCase();
  if (!/^[a-z0-9-]{3,30}$/.test(normalized)) {
    return null;
  }
  return readJsonFileOrNull<TenantProfile>('config', 'tenants', `${normalized}.json`);
}

/** List all tenant profiles under config/tenants/*.json */
export async function listTenantProfiles(): Promise<TenantProfile[]> {
  const dir = resolveRepoPath('config', 'tenants');
  const files = await readdir(dir, { withFileTypes: true });
  const rows: TenantProfile[] = [];
  for (const file of files) {
    if (!file.isFile() || !isTenantConfigFile(file.name)) {
      continue;
    }
    const row = await readJsonFileOrNull<TenantProfile>('config', 'tenants', file.name);
    if (row?.tenant_slug) {
      rows.push(row);
    }
  }
  return rows;
}
