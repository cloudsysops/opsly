import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveOpslyRepoRoot } from '../tools-execute';

export type ModuleDefinition = {
  id: string;
  name: string;
  description: string;
  category: string;
  tier: string;
  required_by: string[];
  requires: string[];
  bootstrap_script: string | null;
  smoke_script: string | null;
  manual_steps: string[];
  estimated_setup_minutes: number;
  cost_level: string;
};

type RawCatalog = {
  modules: Record<
    string,
    {
      id: string;
      name: string;
      description: string;
      category: string;
      tier: string;
      required_by?: string[];
      requires?: string[];
      bootstrap_script?: string | null;
      smoke_script?: string | null;
      manual_steps?: string[];
      estimated_setup_minutes?: number;
      cost_level?: string;
    }
  >;
};

let cached: Record<string, ModuleDefinition> | null = null;

export function loadModuleCatalog(): Record<string, ModuleDefinition> {
  if (cached) {
    return cached;
  }
  const repoRoot = resolveOpslyRepoRoot();
  const raw = readFileSync(
    join(repoRoot, 'config', 'tenant-modules-catalog.json'),
    'utf8'
  );
  const parsed = JSON.parse(raw) as RawCatalog;
  const result: Record<string, ModuleDefinition> = {};
  for (const [id, mod] of Object.entries(parsed.modules)) {
    result[id] = {
      id: mod.id,
      name: mod.name,
      description: mod.description,
      category: mod.category,
      tier: mod.tier,
      required_by: mod.required_by ?? [],
      requires: mod.requires ?? [],
      bootstrap_script: mod.bootstrap_script ?? null,
      smoke_script: mod.smoke_script ?? null,
      manual_steps: mod.manual_steps ?? [],
      estimated_setup_minutes: mod.estimated_setup_minutes ?? 30,
      cost_level: mod.cost_level ?? 'unknown',
    };
  }
  cached = result;
  return result;
}

export function getModuleDefinition(moduleId: string): ModuleDefinition | null {
  return loadModuleCatalog()[moduleId] ?? null;
}
