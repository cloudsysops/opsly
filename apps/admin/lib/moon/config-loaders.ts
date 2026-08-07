import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Server-only helpers to enrich Moon views from repo config (no secrets).
 */

function resolveRepoRoot(): string {
  const cwd = process.cwd();
  if (existsSync(join(cwd, 'config', 'tenants'))) {
    return cwd;
  }
  if (existsSync(join(cwd, '..', '..', 'config', 'tenants'))) {
    return join(cwd, '..', '..');
  }
  if (existsSync(join(cwd, '..', 'config', 'tenants'))) {
    return join(cwd, '..');
  }
  return cwd;
}

export type MoonTenantConfigSummary = {
  slug: string;
  vertical: string | null;
  modules_enabled: string[];
  public_url: string | null;
  stack_type: string | null;
};

export async function loadTenantConfigSummaries(): Promise<MoonTenantConfigSummary[]> {
  const root = resolveRepoRoot();
  const dir = join(root, 'config', 'tenants');
  if (!existsSync(dir)) {
    return [];
  }
  const { readdir } = await import('node:fs/promises');
  const files = await readdir(dir);
  const out: MoonTenantConfigSummary[] = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    if (file.startsWith('_') || file.startsWith('schema')) continue;
    try {
      const raw = await readFile(join(dir, file), 'utf8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const slug = String(parsed.tenant_slug ?? parsed.slug ?? file.replace(/\.json$/, ''));
      out.push({
        slug,
        vertical: typeof parsed.vertical === 'string' ? parsed.vertical : null,
        modules_enabled: Array.isArray(parsed.modules_enabled)
          ? parsed.modules_enabled.filter((x): x is string => typeof x === 'string')
          : [],
        public_url: typeof parsed.public_url === 'string' ? parsed.public_url : null,
        stack_type: typeof parsed.stack_type === 'string' ? parsed.stack_type : null,
      });
    } catch {
      // skip invalid config files
    }
  }
  return out;
}

export type MoonModuleRegistryEntry = {
  id: string;
  name: string;
  version: string;
  status: string;
  description: string;
};

export async function loadLibModuleRegistry(): Promise<MoonModuleRegistryEntry[]> {
  const root = resolveRepoRoot();
  const path = join(root, 'config', 'modules.json');
  if (!existsSync(path)) return [];
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as {
      modules?: Record<string, { name?: string; version?: string; status?: string; description?: string }>;
    };
    if (!parsed.modules) return [];
    return Object.entries(parsed.modules).map(([id, mod]) => ({
      id,
      name: mod.name ?? id,
      version: mod.version ?? '0.0.0',
      status: mod.status ?? 'unknown',
      description: mod.description ?? '',
    }));
  } catch {
    return [];
  }
}

export type MoonVerticalBlueprint = {
  id: string;
  label: string;
  reference_tenant: string | null;
};

export async function loadVerticalBlueprints(): Promise<MoonVerticalBlueprint[]> {
  const root = resolveRepoRoot();
  const path = join(root, 'config', 'vertical-blueprints', 'index.json');
  if (!existsSync(path)) return [];
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as {
      verticals?: Array<{ id: string; label?: string; reference_tenant?: string }>;
    };
    return (parsed.verticals ?? []).map((v) => ({
      id: v.id,
      label: v.label ?? v.id,
      reference_tenant: v.reference_tenant ?? null,
    }));
  } catch {
    return [];
  }
}

export type MoonExternalWorker = {
  id: string;
  enabled: boolean;
  kind: string;
  opsly_job_type: string | null;
  write_access: boolean | null;
};

export async function loadExternalAgentWorkers(): Promise<MoonExternalWorker[]> {
  const root = resolveRepoRoot();
  const path = join(root, 'config', 'external-agent-registry.json');
  if (!existsSync(path)) return [];
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as {
      workers?: Record<
        string,
        { enabled?: boolean; kind?: string; opsly_job_type?: string; write_access?: boolean }
      >;
    };
    return Object.entries(parsed.workers ?? {}).map(([id, w]) => ({
      id,
      enabled: w.enabled === true,
      kind: w.kind ?? 'unknown',
      opsly_job_type: w.opsly_job_type ?? null,
      write_access: typeof w.write_access === 'boolean' ? w.write_access : null,
    }));
  } catch {
    return [];
  }
}

export type MoonAgentServiceEntry = {
  id: string;
  enabled: boolean;
  url_env: string | null;
  default_url: string | null;
  local: boolean;
  required_secret_names: string[];
};

export async function loadAgentServicesRegistry(): Promise<MoonAgentServiceEntry[]> {
  const root = resolveRepoRoot();
  const path = join(root, 'config', 'agent-services.json');
  if (!existsSync(path)) return [];
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as {
      services?: Record<
        string,
        {
          enabled?: boolean;
          envUrl?: string;
          url?: string;
          type?: string;
          required_secrets?: string[];
        }
      >;
    };
    return Object.entries(parsed.services ?? {}).map(([id, s]) => ({
      id,
      enabled: s.enabled !== false,
      url_env: typeof s.envUrl === 'string' ? s.envUrl : null,
      default_url: typeof s.url === 'string' ? s.url : null,
      local: typeof s.url === 'string' && s.url.includes('localhost'),
      required_secret_names: Array.isArray(s.required_secrets)
        ? s.required_secrets.filter((x): x is string => typeof x === 'string')
        : [],
    }));
  } catch {
    return [];
  }
}

export type MoonCapabilityAgent = {
  id: string;
  role: string;
  write_access: boolean;
  risk_ceiling: string | null;
  endpoint_env: string | null;
  best_for: string[];
};

export async function loadAgentCapabilities(): Promise<MoonCapabilityAgent[]> {
  const root = resolveRepoRoot();
  const path = join(root, 'config', 'agent-capabilities.json');
  if (!existsSync(path)) return [];
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as {
      agents?: Record<
        string,
        {
          role?: string;
          write_access?: boolean;
          risk_ceiling?: string;
          endpoint_env?: string;
          best_for?: string[];
        }
      >;
    };
    return Object.entries(parsed.agents ?? {}).map(([id, cfg]) => ({
      id,
      role: cfg.role ?? 'unknown',
      write_access: cfg.write_access === true,
      risk_ceiling: typeof cfg.risk_ceiling === 'string' ? cfg.risk_ceiling : null,
      endpoint_env: typeof cfg.endpoint_env === 'string' ? cfg.endpoint_env : null,
      best_for: Array.isArray(cfg.best_for)
        ? cfg.best_for.filter((x): x is string => typeof x === 'string')
        : [],
    }));
  } catch {
    return [];
  }
}

export type MoonVentureStub = {
  id: string;
  name: string;
  status: string;
  source: string;
};

/**
 * Ventures: only from config when present. Never invent Salud Journey etc.
 */
export async function loadConfiguredVentures(): Promise<MoonVentureStub[]> {
  const root = resolveRepoRoot();
  const path = join(root, 'config', 'ventures.json');
  if (!existsSync(path)) return [];
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as {
      ventures?: Array<{ id?: string; name?: string; status?: string }>;
    };
    return (parsed.ventures ?? [])
      .filter((v) => typeof v.id === 'string' && typeof v.name === 'string')
      .map((v) => ({
        id: String(v.id),
        name: String(v.name),
        status: typeof v.status === 'string' ? v.status : 'Idea',
        source: 'config/ventures.json',
      }));
  } catch {
    return [];
  }
}

export type MoonAcademyBlueprintSummary = {
  id: string;
  label: string;
  path: string;
  modules_listed: number;
  has_readme: boolean;
};

/**
 * Index academy blueprint pack without inventing product ventures.
 */
export async function loadAcademyBlueprintSummary(): Promise<MoonAcademyBlueprintSummary | null> {
  const root = resolveRepoRoot();
  const dir = join(root, 'config', 'blueprints', 'academy');
  if (!existsSync(dir)) return null;
  const modulesDir = join(dir, 'modules');
  let modulesListed = 0;
  if (existsSync(modulesDir)) {
    const { readdir } = await import('node:fs/promises');
    const files = await readdir(modulesDir);
    modulesListed = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml')).length;
  }
  return {
    id: 'academy',
    label: 'Academy vertical blueprint',
    path: 'config/blueprints/academy',
    modules_listed: modulesListed,
    has_readme: existsSync(join(dir, 'README.md')),
  };
}
