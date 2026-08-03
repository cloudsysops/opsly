import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Reads config/commercial-catalog.json's module ids so entitlement grants
 * can be checked against the real catalog instead of just a format regex.
 * Deliberately reads the repo-root file directly (fs, not an app-local
 * mirror/import) — apps/icso has its own copy at apps/icso/content/, but
 * cross-app imports between unrelated Next apps aren't a pattern this repo
 * uses, and the root file is the canonical source.
 */

interface CommercialCatalogModule {
  id: string;
}

interface CommercialCatalogFile {
  modules: CommercialCatalogModule[];
}

let cachedModuleIds: Set<string> | null = null;

function getRepoRoot(): string {
  const override = process.env.OPSLY_REPO_ROOT?.trim();
  if (override) return override;
  let current = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(path.join(current, 'config', 'commercial-catalog.json'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

export function getCommercialCatalogModuleIds(): Set<string> {
  if (cachedModuleIds) return cachedModuleIds;
  const filePath = path.join(getRepoRoot(), 'config', 'commercial-catalog.json');
  const raw = readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as CommercialCatalogFile;
  cachedModuleIds = new Set(parsed.modules.map((mod) => mod.id));
  return cachedModuleIds;
}

/** Test-only: clears the module-id cache so tests can point at different fixtures. */
export function resetCommercialCatalogCache(): void {
  cachedModuleIds = null;
}
