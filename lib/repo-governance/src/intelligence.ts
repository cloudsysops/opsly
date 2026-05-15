import { readdir, stat, access } from 'node:fs/promises';
import { join } from 'node:path';
import { constants } from 'node:fs';

import type { RepoIntelligenceSnapshot } from './types.js';
import { loadRepoGovernanceConfig } from './policy.js';
import { findRepoRoot } from './paths.js';

async function listDirs(root: string, name: string): Promise<string[]> {
  const base = join(root, name);
  try {
    const entries = await readdir(base, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

async function countApiRoutes(apiAppRoot: string): Promise<number> {
  let count = 0;
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) {
        await walk(full);
      } else if (ent.isFile() && ent.name === 'route.ts') {
        count += 1;
      }
    }
  }
  try {
    await access(apiAppRoot, constants.F_OK);
    await walk(apiAppRoot);
  } catch {
    /* api app missing */
  }
  return count;
}

export async function buildRepoIntelligence(root?: string): Promise<RepoIntelligenceSnapshot> {
  const repoRoot = root ?? findRepoRoot();
  const config = await loadRepoGovernanceConfig(repoRoot);

  const topLevel = await readdir(repoRoot, { withFileTypes: true });
  const topLevelDirs = topLevel.filter((e) => e.isDirectory()).map((e) => e.name).sort();

  const apps = await listDirs(repoRoot, 'apps');
  const libDirs = await listDirs(repoRoot, 'lib');
  const libPackages = libDirs.filter((d) => !d.startsWith('.'));

  const archPresent: string[] = [];
  const archMissing: string[] = [];
  for (const doc of config.architecture_docs) {
    const full = join(repoRoot, doc);
    try {
      await access(full, constants.F_OK);
      archPresent.push(doc);
    } catch {
      archMissing.push(doc);
    }
  }

  const apiRoutes = await countApiRoutes(join(repoRoot, 'apps/api/app/api'));

  return {
    repo_root: repoRoot,
    scanned_at: new Date().toISOString(),
    top_level_dirs: topLevelDirs,
    apps,
    api_route_count: apiRoutes,
    lib_packages: libPackages,
    architecture_docs_present: archPresent,
    architecture_docs_missing: archMissing,
    canon_services: config.canon_services,
  };
}
