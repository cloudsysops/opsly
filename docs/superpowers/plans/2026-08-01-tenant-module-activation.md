# Tenant Module Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the operator activate a catalog module (Twenty, wacrm, n8n, llm, uptime) for a tenant from `apps/admin`, without running scripts by hand over SSH.

**Architecture:** `apps/api` (already running directly on the VPS, already shelling out to `docker compose` via `execa` in `lib/docker/container.ts`) runs the module's `bootstrap_script`/`smoke_script` from `config/tenant-modules-catalog.json` as a fire-and-forget background task — the exact pattern `provisionTenant()` already uses in `lib/orchestrator.ts`. State lives in a new `platform.tenant_modules` table. `apps/admin` polls it via SWR.

**Tech Stack:** Next.js App Router (apps/api, apps/admin), Supabase (`platform` schema), Zod, `execa`, Vitest, SWR.

## Global Constraints

- No `any` in TypeScript — always specific types.
- Business logic in `lib/services/`, never in route handlers.
- Zod validation on every request body/param.
- `requireAdminAccess()` (mutations) / `requireAdminAccessUnlessDemoRead()` (reads) on every route — same as `apps/api/app/api/tenants/[slug]/route.ts`.
- Errors: `jsonError()` with a sanitized message; never leak raw Supabase errors or script stderr to the HTTP client — log server-side only.
- Migrations: additive, `IF NOT EXISTS` / `CHECK` constraints, `service_role`-only RLS — match `supabase/migrations/0089_peskids_aging_alert_deliveries.sql` style exactly.
- Tests required for all `lib/` logic (Vitest, mocks for Supabase and `execa` — no real network/process calls in tests).
- Relative import depth: count directory segments under `apps/api/` (or `apps/admin/`) that the file lives in — that's how many `../` are needed to reach `apps/api/lib/` (or `apps/admin/lib/`). Double-check every new route file's imports against this before running tests; a miscount fails at import time, not at a type-check.

---

## File Structure

- Create `supabase/migrations/0093_tenant_modules.sql` — new table.
- Create `apps/api/lib/tenant-modules/catalog.ts` — typed reader for `config/tenant-modules-catalog.json`.
- Create `apps/api/lib/tenant-modules/provisioning.ts` — `runModuleProvisioning()`, the `execa`-based background runner.
- Modify `apps/api/lib/validation.ts` — add `ModuleIdParamSchema`.
- Create `apps/api/lib/services/tenant-modules.service.ts` — DB reads/writes for `tenant_modules`, dependency validation, catalog merge.
- Create `apps/api/app/api/tenants/[slug]/modules/route.ts` — `GET`.
- Create `apps/api/app/api/tenants/[slug]/modules/[moduleId]/activate/route.ts` — `POST`.
- Create `apps/api/app/api/tenants/[slug]/modules/[moduleId]/deactivate/route.ts` — `POST`.
- Create `apps/api/app/api/tenants/[slug]/modules/[moduleId]/mark-manual-steps-done/route.ts` — `POST`.
- Modify `apps/admin/lib/types.ts` — add `TenantModule`, `TenantModulesResponse` types.
- Modify `apps/admin/lib/api-client.ts` — add `getTenantModules`, `activateTenantModule`, `markManualStepsDone`.
- Create `apps/admin/hooks/useTenantModules.ts`.
- Create `apps/admin/components/tenants/ModulesCard.tsx`.
- Modify `apps/admin/app/tenants/[slug]/page.tsx` — render `ModulesCard`.

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/0093_tenant_modules.sql`

**Interfaces:**
- Produces: table `platform.tenant_modules(tenant_slug text, module_id text, status text, last_error text, requested_at timestamptz, activated_at timestamptz, updated_at timestamptz)`, unique on `(tenant_slug, module_id)`.

- [ ] **Step 1: Write the migration file**

```sql
-- Tenant module activation tracking — apps/admin drives bootstrap_script/smoke_script
-- execution from apps/api; this table is the status record apps/admin polls.
BEGIN;

CREATE TABLE IF NOT EXISTS platform.tenant_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL REFERENCES platform.tenants (slug) ON DELETE CASCADE,
  module_id text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'provisioning', 'active', 'active_needs_manual_steps', 'failed', 'disabled')),
  last_error text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_modules_tenant_module_unique UNIQUE (tenant_slug, module_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant
  ON platform.tenant_modules (tenant_slug);

ALTER TABLE platform.tenant_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_tenant_modules" ON platform.tenant_modules;
CREATE POLICY "service_role_all_tenant_modules"
  ON platform.tenant_modules
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON platform.tenant_modules TO service_role;

COMMIT;
```

- [ ] **Step 2: Apply locally and verify**

Run: `npx supabase db push --local` (or the project's existing local migration runner — check `apps/api/README.md` if this differs; the important check is that the table exists).
Expected: no errors; `platform.tenant_modules` exists.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0093_tenant_modules.sql
git commit -m "feat(db): add platform.tenant_modules for module activation tracking"
```

---

### Task 2: Catalog reader

**Files:**
- Create: `apps/api/lib/tenant-modules/catalog.ts`
- Test: `apps/api/lib/tenant-modules/__tests__/catalog.test.ts`

**Interfaces:**
- Consumes: `config/tenant-modules-catalog.json` (repo-relative), `resolveOpslyRepoRoot()` from `apps/api/lib/tools-execute.ts`.
- Produces:
  ```ts
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
  export function loadModuleCatalog(): Record<string, ModuleDefinition>;
  export function getModuleDefinition(moduleId: string): ModuleDefinition | null;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/lib/tenant-modules/__tests__/catalog.test.ts
import { describe, it, expect } from 'vitest';
import { loadModuleCatalog, getModuleDefinition } from '../catalog';

describe('tenant module catalog', () => {
  it('loads the real catalog file with known modules', () => {
    const catalog = loadModuleCatalog();
    expect(catalog.twenty).toBeDefined();
    expect(catalog.twenty.bootstrap_script).toContain('bootstrap-twenty.sh');
  });

  it('returns null for an unknown module id', () => {
    expect(getModuleDefinition('does-not-exist')).toBeNull();
  });

  it('returns the wacrm module with its "requires" dependency on twenty', () => {
    const wacrm = getModuleDefinition('wacrm');
    expect(wacrm?.requires).toEqual(['twenty']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/api/lib/tenant-modules/__tests__/catalog.test.ts`
Expected: FAIL — `Cannot find module '../catalog'`

- [ ] **Step 3: Write the implementation**

```ts
// apps/api/lib/tenant-modules/catalog.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/api/lib/tenant-modules/__tests__/catalog.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/lib/tenant-modules/catalog.ts apps/api/lib/tenant-modules/__tests__/catalog.test.ts
git commit -m "feat(api): add tenant module catalog reader"
```

---

### Task 3: Validation schema

**Files:**
- Modify: `apps/api/lib/validation.ts`

**Interfaces:**
- Produces: `ModuleIdParamSchema: z.ZodString` (lowercase, `[a-z0-9-]+`, matches catalog `id` style).

- [ ] **Step 1: Add the schema**

Append to `apps/api/lib/validation.ts` (near `TenantRefParamSchema`):

```ts
export const ModuleIdParamSchema = z
  .string()
  .regex(/^[a-z0-9-]{1,50}$/, 'Invalid module id');
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p apps/api/tsconfig.json`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/lib/validation.ts
git commit -m "feat(api): add ModuleIdParamSchema for tenant module routes"
```

---

### Task 4: Service layer — read/merge state with catalog

**Files:**
- Create: `apps/api/lib/services/tenant-modules.service.ts`
- Test: `apps/api/lib/services/__tests__/tenant-modules.service.test.ts`

**Interfaces:**
- Consumes: `getServiceClient()` from `../supabase`, `loadModuleCatalog()` from `../tenant-modules/catalog`.
- Produces:
  ```ts
  export type TenantModuleView = ModuleDefinition & {
    status: 'not_installed' | 'queued' | 'provisioning' | 'active' | 'active_needs_manual_steps' | 'failed' | 'disabled';
    last_error: string | null;
  };
  export async function listTenantModules(tenantSlug: string): Promise<TenantModuleView[]>;
  export async function getMissingDependencies(tenantSlug: string, moduleId: string): Promise<string[]>;
  export async function upsertTenantModuleStatus(
    tenantSlug: string,
    moduleId: string,
    status: TenantModuleView['status'],
    extra?: { last_error?: string | null; activated_at?: string | null }
  ): Promise<void>;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/lib/services/__tests__/tenant-modules.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as supabaseMod from '../../supabase';
import {
  listTenantModules,
  getMissingDependencies,
  upsertTenantModuleStatus,
} from '../tenant-modules.service';

vi.mock('../../supabase', () => ({ getServiceClient: vi.fn() }));

function mockSelectChain(rows: unknown[]): ReturnType<typeof supabaseMod.getServiceClient> {
  const chain = {
    schema: () => chain,
    from: () => chain,
    select: () => chain,
    eq: () => Promise.resolve({ data: rows, error: null }),
  };
  return chain as ReturnType<typeof supabaseMod.getServiceClient>;
}

function mockUpsertChain(): { chain: unknown; upsert: ReturnType<typeof vi.fn> } {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const chain = {
    schema: () => chain,
    from: () => chain,
    upsert,
  };
  return { chain, upsert };
}

describe('listTenantModules', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks catalog modules with no DB row as not_installed', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(mockSelectChain([]));
    const modules = await listTenantModules('peskids');
    const twenty = modules.find((m) => m.id === 'twenty');
    expect(twenty?.status).toBe('not_installed');
  });

  it('uses the DB status when a row exists', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockSelectChain([{ module_id: 'twenty', status: 'active', last_error: null }])
    );
    const modules = await listTenantModules('peskids');
    const twenty = modules.find((m) => m.id === 'twenty');
    expect(twenty?.status).toBe('active');
  });
});

describe('getMissingDependencies', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the missing "requires" module for wacrm when twenty is not active', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(mockSelectChain([]));
    const missing = await getMissingDependencies('peskids', 'wacrm');
    expect(missing).toEqual(['twenty']);
  });

  it('returns an empty list when the dependency is already active', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockSelectChain([{ module_id: 'twenty', status: 'active', last_error: null }])
    );
    const missing = await getMissingDependencies('peskids', 'wacrm');
    expect(missing).toEqual([]);
  });
});

describe('upsertTenantModuleStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts on (tenant_slug, module_id)', async () => {
    const { chain, upsert } = mockUpsertChain();
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      chain as ReturnType<typeof supabaseMod.getServiceClient>
    );
    await upsertTenantModuleStatus('peskids', 'twenty', 'queued');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_slug: 'peskids', module_id: 'twenty', status: 'queued' }),
      expect.objectContaining({ onConflict: 'tenant_slug,module_id' })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/api/lib/services/__tests__/tenant-modules.service.test.ts`
Expected: FAIL — `Cannot find module '../tenant-modules.service'`

- [ ] **Step 3: Write the implementation**

```ts
// apps/api/lib/services/tenant-modules.service.ts
import { getServiceClient } from '../supabase';
import { loadModuleCatalog, type ModuleDefinition } from '../tenant-modules/catalog';

export type TenantModuleStatus =
  | 'not_installed'
  | 'queued'
  | 'provisioning'
  | 'active'
  | 'active_needs_manual_steps'
  | 'failed'
  | 'disabled';

export type TenantModuleView = ModuleDefinition & {
  status: TenantModuleStatus;
  last_error: string | null;
};

type TenantModuleRow = {
  module_id: string;
  status: TenantModuleStatus;
  last_error: string | null;
};

async function fetchTenantModuleRows(tenantSlug: string): Promise<TenantModuleRow[]> {
  const { data, error } = await getServiceClient()
    .schema('platform')
    .from('tenant_modules')
    .select('module_id, status, last_error')
    .eq('tenant_slug', tenantSlug);

  if (error) {
    throw new Error(`Failed to load tenant_modules: ${error.message}`);
  }
  return (data ?? []) as TenantModuleRow[];
}

export async function listTenantModules(tenantSlug: string): Promise<TenantModuleView[]> {
  const catalog = loadModuleCatalog();
  const rows = await fetchTenantModuleRows(tenantSlug);
  const rowsByModule = new Map(rows.map((r) => [r.module_id, r]));

  return Object.values(catalog).map((mod) => {
    const row = rowsByModule.get(mod.id);
    return {
      ...mod,
      status: row?.status ?? 'not_installed',
      last_error: row?.last_error ?? null,
    };
  });
}

const ACTIVE_LIKE_STATUSES: TenantModuleStatus[] = ['active', 'active_needs_manual_steps'];

export async function getMissingDependencies(
  tenantSlug: string,
  moduleId: string
): Promise<string[]> {
  const catalog = loadModuleCatalog();
  const mod = catalog[moduleId];
  if (!mod || mod.requires.length === 0) {
    return [];
  }
  const rows = await fetchTenantModuleRows(tenantSlug);
  const rowsByModule = new Map(rows.map((r) => [r.module_id, r]));
  return mod.requires.filter((depId) => {
    const status = rowsByModule.get(depId)?.status ?? 'not_installed';
    return !ACTIVE_LIKE_STATUSES.includes(status);
  });
}

export async function upsertTenantModuleStatus(
  tenantSlug: string,
  moduleId: string,
  status: TenantModuleStatus,
  extra?: { last_error?: string | null; activated_at?: string | null }
): Promise<void> {
  const { error } = await getServiceClient()
    .schema('platform')
    .from('tenant_modules')
    .upsert(
      {
        tenant_slug: tenantSlug,
        module_id: moduleId,
        status,
        last_error: extra?.last_error ?? null,
        ...(extra?.activated_at !== undefined ? { activated_at: extra.activated_at } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_slug,module_id' }
    );

  if (error) {
    throw new Error(`Failed to upsert tenant_modules: ${error.message}`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/api/lib/services/__tests__/tenant-modules.service.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/lib/services/tenant-modules.service.ts apps/api/lib/services/__tests__/tenant-modules.service.test.ts
git commit -m "feat(api): tenant module status service (catalog + DB merge)"
```

---

### Task 5: Background provisioning runner

**Files:**
- Create: `apps/api/lib/tenant-modules/provisioning.ts`
- Test: `apps/api/lib/tenant-modules/__tests__/provisioning.test.ts`

**Interfaces:**
- Consumes: `getModuleDefinition()` (Task 2), `upsertTenantModuleStatus()` (Task 4), `resolveOpslyRepoRoot()` from `../tools-execute`, `execa` from the `execa` package.
- Produces: `export async function runModuleProvisioning(tenantSlug: string, moduleId: string): Promise<void>` — never throws (catches internally, always resolves the module to a terminal status).

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/lib/tenant-modules/__tests__/provisioning.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execa } from 'execa';
import * as serviceMod from '../../services/tenant-modules.service';
import * as catalogMod from '../catalog';
import { runModuleProvisioning } from '../provisioning';

vi.mock('execa', () => ({ execa: vi.fn() }));
vi.mock('../../services/tenant-modules.service', () => ({
  upsertTenantModuleStatus: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../catalog', () => ({ getModuleDefinition: vi.fn() }));

describe('runModuleProvisioning', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks the module active when bootstrap and smoke both succeed and there are no manual steps', async () => {
    vi.mocked(catalogMod.getModuleDefinition).mockReturnValue({
      id: 'uptime',
      name: 'Uptime Kuma Monitor',
      description: '',
      category: 'monitoring',
      tier: 'starter',
      required_by: [],
      requires: [],
      bootstrap_script: null,
      smoke_script: null,
      manual_steps: [],
      estimated_setup_minutes: 10,
      cost_level: 'low',
    });

    await runModuleProvisioning('peskids', 'uptime');

    expect(serviceMod.upsertTenantModuleStatus).toHaveBeenCalledWith(
      'peskids',
      'uptime',
      'provisioning'
    );
    expect(serviceMod.upsertTenantModuleStatus).toHaveBeenLastCalledWith(
      'peskids',
      'uptime',
      'active',
      expect.objectContaining({ activated_at: expect.any(String) })
    );
  });

  it('marks the module active_needs_manual_steps when the catalog lists manual steps', async () => {
    vi.mocked(catalogMod.getModuleDefinition).mockReturnValue({
      id: 'twenty',
      name: 'Twenty CRM',
      description: '',
      category: 'crm',
      tier: 'starter',
      required_by: [],
      requires: [],
      bootstrap_script: 'scripts/tenants/bootstrap-twenty.sh --tenant ${slug}',
      smoke_script: 'scripts/tenants/twenty-crm-smoke.sh --tenant ${slug}',
      manual_steps: ['Crear primer workspace admin'],
      estimated_setup_minutes: 20,
      cost_level: 'low',
    });
    vi.mocked(execa).mockResolvedValue({ stdout: 'ok', stderr: '' } as never);

    await runModuleProvisioning('peskids', 'twenty');

    expect(execa).toHaveBeenCalledTimes(2);
    expect(serviceMod.upsertTenantModuleStatus).toHaveBeenLastCalledWith(
      'peskids',
      'twenty',
      'active_needs_manual_steps',
      expect.objectContaining({ activated_at: expect.any(String) })
    );
  });

  it('marks the module failed with stderr when the bootstrap script fails', async () => {
    vi.mocked(catalogMod.getModuleDefinition).mockReturnValue({
      id: 'twenty',
      name: 'Twenty CRM',
      description: '',
      category: 'crm',
      tier: 'starter',
      required_by: [],
      requires: [],
      bootstrap_script: 'scripts/tenants/bootstrap-twenty.sh --tenant ${slug}',
      smoke_script: null,
      manual_steps: [],
      estimated_setup_minutes: 20,
      cost_level: 'low',
    });
    vi.mocked(execa).mockRejectedValue(
      Object.assign(new Error('exit 1'), { stderr: 'doppler flag missing' })
    );

    await runModuleProvisioning('peskids', 'twenty');

    expect(serviceMod.upsertTenantModuleStatus).toHaveBeenLastCalledWith(
      'peskids',
      'twenty',
      'failed',
      expect.objectContaining({ last_error: expect.stringContaining('doppler flag missing') })
    );
  });

  it('marks the module failed if the catalog has no definition for the id', async () => {
    vi.mocked(catalogMod.getModuleDefinition).mockReturnValue(null);

    await runModuleProvisioning('peskids', 'unknown-module');

    expect(serviceMod.upsertTenantModuleStatus).toHaveBeenLastCalledWith(
      'peskids',
      'unknown-module',
      'failed',
      expect.objectContaining({ last_error: expect.stringContaining('Unknown module') })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/api/lib/tenant-modules/__tests__/provisioning.test.ts`
Expected: FAIL — `Cannot find module '../provisioning'`

- [ ] **Step 3: Write the implementation**

```ts
// apps/api/lib/tenant-modules/provisioning.ts
import { execa } from 'execa';
import { resolveOpslyRepoRoot } from '../tools-execute';
import { upsertTenantModuleStatus } from '../services/tenant-modules.service';
import { getModuleDefinition } from './catalog';

function parseScriptCommand(script: string, tenantSlug: string): { file: string; args: string[] } {
  const withSlug = script.replace(/\$\{slug\}/g, tenantSlug);
  const [file, ...args] = withSlug.split(' ').filter((part) => part.length > 0);
  return { file, args };
}

function tailStderr(err: unknown): string {
  if (err && typeof err === 'object' && 'stderr' in err) {
    const stderr = (err as { stderr?: unknown }).stderr;
    if (typeof stderr === 'string' && stderr.length > 0) {
      return stderr.slice(-2000);
    }
  }
  return err instanceof Error ? err.message : String(err);
}

async function runScript(script: string, tenantSlug: string, timeoutMinutes: number): Promise<void> {
  const { file, args } = parseScriptCommand(script, tenantSlug);
  await execa(file, args, {
    cwd: resolveOpslyRepoRoot(),
    timeout: timeoutMinutes * 60_000,
  });
}

export async function runModuleProvisioning(tenantSlug: string, moduleId: string): Promise<void> {
  const mod = getModuleDefinition(moduleId);
  if (!mod) {
    await upsertTenantModuleStatus(tenantSlug, moduleId, 'failed', {
      last_error: `Unknown module id in catalog: ${moduleId}`,
    });
    return;
  }

  await upsertTenantModuleStatus(tenantSlug, moduleId, 'provisioning');

  try {
    if (mod.bootstrap_script) {
      await runScript(mod.bootstrap_script, tenantSlug, mod.estimated_setup_minutes * 2);
    }
    if (mod.smoke_script) {
      await runScript(mod.smoke_script, tenantSlug, mod.estimated_setup_minutes);
    }
  } catch (err) {
    await upsertTenantModuleStatus(tenantSlug, moduleId, 'failed', {
      last_error: tailStderr(err),
    });
    return;
  }

  const finalStatus = mod.manual_steps.length > 0 ? 'active_needs_manual_steps' : 'active';
  await upsertTenantModuleStatus(tenantSlug, moduleId, finalStatus, {
    activated_at: new Date().toISOString(),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/api/lib/tenant-modules/__tests__/provisioning.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/lib/tenant-modules/provisioning.ts apps/api/lib/tenant-modules/__tests__/provisioning.test.ts
git commit -m "feat(api): fire-and-forget module provisioning runner (execa, no SSH/BullMQ)"
```

---

### Task 6: API routes

**Files:**
- Create: `apps/api/app/api/tenants/[slug]/modules/route.ts` (5 levels under `apps/api/` → imports need `../../../../../lib/...`)
- Create: `apps/api/app/api/tenants/[slug]/modules/[moduleId]/activate/route.ts` (7 levels → `../../../../../../../lib/...`)
- Create: `apps/api/app/api/tenants/[slug]/modules/[moduleId]/deactivate/route.ts` (7 levels → `../../../../../../../lib/...`)
- Create: `apps/api/app/api/tenants/[slug]/modules/[moduleId]/mark-manual-steps-done/route.ts` (7 levels → `../../../../../../../lib/...`)
- Test: `apps/api/app/api/tenants/[slug]/modules/__tests__/route.test.ts` (6 levels → `../../../../../../lib/...`)
- Test: `apps/api/app/api/tenants/[slug]/modules/[moduleId]/activate/__tests__/route.test.ts` (8 levels → `../../../../../../../../lib/...`)

**Interfaces:**
- Consumes (import depth varies per file — see above): `requireAdminAccess`/`requireAdminAccessUnlessDemoRead` from `lib/auth`, `jsonError`/`jsonOk`/`serverErrorLogged` from `lib/api-response`, `HTTP_STATUS` from `lib/constants`, `TenantRefParamSchema`/`ModuleIdParamSchema`/`formatZodError` from `lib/validation`, everything from Tasks 4-5.

- [ ] **Step 1: Write the failing tests**

```ts
// apps/api/app/api/tenants/[slug]/modules/__tests__/route.test.ts
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { GET } from '../route';
import * as serviceMod from '../../../../../../lib/services/tenant-modules.service';

vi.mock('../../../../../../lib/services/tenant-modules.service', () => ({
  listTenantModules: vi.fn(),
}));

const ADMIN = 'test-admin-token-for-modules-route';

describe('GET /api/tenants/[slug]/modules', () => {
  beforeAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
  });
  afterAll(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
  });
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without Authorization', async () => {
    const req = new Request('http://local/api/tenants/peskids/modules');
    const res = await GET(req, { params: Promise.resolve({ slug: 'peskids' }) });
    expect(res.status).toBe(401);
  });

  it('returns the module list when authorized', async () => {
    vi.mocked(serviceMod.listTenantModules).mockResolvedValue([]);
    const req = new Request('http://local/api/tenants/peskids/modules', {
      headers: { authorization: `Bearer ${ADMIN}` },
    });
    const res = await GET(req, { params: Promise.resolve({ slug: 'peskids' }) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { modules: unknown[] };
    expect(body.modules).toEqual([]);
  });
});
```

```ts
// apps/api/app/api/tenants/[slug]/modules/[moduleId]/activate/__tests__/route.test.ts
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { POST } from '../route';
import * as serviceMod from '../../../../../../../../lib/services/tenant-modules.service';
import * as provisioningMod from '../../../../../../../../lib/tenant-modules/provisioning';

vi.mock('../../../../../../../../lib/services/tenant-modules.service', () => ({
  getMissingDependencies: vi.fn(),
  upsertTenantModuleStatus: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../../../../../../lib/tenant-modules/provisioning', () => ({
  runModuleProvisioning: vi.fn().mockResolvedValue(undefined),
}));

const ADMIN = 'test-admin-token-for-activate-route';

function ctx(): { params: Promise<{ slug: string; moduleId: string }> } {
  return { params: Promise.resolve({ slug: 'peskids', moduleId: 'wacrm' }) };
}

describe('POST /api/tenants/[slug]/modules/[moduleId]/activate', () => {
  beforeAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
  });
  afterAll(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
  });
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without Authorization', async () => {
    const req = new Request('http://local/api/tenants/peskids/modules/wacrm/activate', {
      method: 'POST',
    });
    const res = await POST(req, ctx());
    expect(res.status).toBe(401);
  });

  it('returns 409 with missing dependencies when requires are not met', async () => {
    vi.mocked(serviceMod.getMissingDependencies).mockResolvedValue(['twenty']);
    const req = new Request('http://local/api/tenants/peskids/modules/wacrm/activate', {
      method: 'POST',
      headers: { authorization: `Bearer ${ADMIN}` },
    });
    const res = await POST(req, ctx());
    expect(res.status).toBe(409);
    const body = (await res.json()) as { missing_dependencies: string[] };
    expect(body.missing_dependencies).toEqual(['twenty']);
    expect(provisioningMod.runModuleProvisioning).not.toHaveBeenCalled();
  });

  it('queues the module and kicks off provisioning without waiting for it', async () => {
    vi.mocked(serviceMod.getMissingDependencies).mockResolvedValue([]);
    const req = new Request('http://local/api/tenants/peskids/modules/wacrm/activate', {
      method: 'POST',
      headers: { authorization: `Bearer ${ADMIN}` },
    });
    const res = await POST(req, ctx());
    expect(res.status).toBe(202);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('queued');
    expect(serviceMod.upsertTenantModuleStatus).toHaveBeenCalledWith('peskids', 'wacrm', 'queued');
    expect(provisioningMod.runModuleProvisioning).toHaveBeenCalledWith('peskids', 'wacrm');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run apps/api/app/api/tenants/[slug]/modules`
Expected: FAIL — route files don't exist yet.

- [ ] **Step 3: Write `route.ts` (GET list) — 5 levels deep**

```ts
// apps/api/app/api/tenants/[slug]/modules/route.ts
import { jsonError, jsonOk, serverErrorLogged } from '../../../../../lib/api-response';
import { requireAdminAccessUnlessDemoRead } from '../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../lib/constants';
import { listTenantModules } from '../../../../../lib/services/tenant-modules.service';
import { TenantRefParamSchema, formatZodError } from '../../../../../lib/validation';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) {
    return authError;
  }

  const { slug } = await context.params;
  const parsed = TenantRefParamSchema.safeParse(slug);
  if (!parsed.success) {
    return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const modules = await listTenantModules(parsed.data);
    return jsonOk({ modules });
  } catch (err) {
    return serverErrorLogged('GET tenant modules:', err);
  }
}
```

- [ ] **Step 4: Write `[moduleId]/activate/route.ts` — 7 levels deep**

```ts
// apps/api/app/api/tenants/[slug]/modules/[moduleId]/activate/route.ts
import { jsonError, jsonOk, serverErrorLogged } from '../../../../../../../lib/api-response';
import { requireAdminAccess } from '../../../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../../../lib/constants';
import { runModuleProvisioning } from '../../../../../../../lib/tenant-modules/provisioning';
import {
  getMissingDependencies,
  upsertTenantModuleStatus,
} from '../../../../../../../lib/services/tenant-modules.service';
import {
  ModuleIdParamSchema,
  TenantRefParamSchema,
  formatZodError,
} from '../../../../../../../lib/validation';

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; moduleId: string }> }
): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const { slug, moduleId } = await context.params;
  const slugParsed = TenantRefParamSchema.safeParse(slug);
  if (!slugParsed.success) {
    return jsonError(formatZodError(slugParsed.error), HTTP_STATUS.BAD_REQUEST);
  }
  const moduleParsed = ModuleIdParamSchema.safeParse(moduleId);
  if (!moduleParsed.success) {
    return jsonError(formatZodError(moduleParsed.error), HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const missing = await getMissingDependencies(slugParsed.data, moduleParsed.data);
    if (missing.length > 0) {
      return Response.json(
        { error: 'Missing module dependencies', missing_dependencies: missing },
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    await upsertTenantModuleStatus(slugParsed.data, moduleParsed.data, 'queued');

    // Fire-and-forget — same pattern as provisionTenant() in lib/orchestrator.ts.
    // Errors are handled and persisted inside runModuleProvisioning itself.
    void runModuleProvisioning(slugParsed.data, moduleParsed.data);

    return jsonOk({ status: 'queued' }, HTTP_STATUS.ACCEPTED);
  } catch (err) {
    return serverErrorLogged('POST activate tenant module:', err);
  }
}
```

- [ ] **Step 5: Write `[moduleId]/deactivate/route.ts` — 7 levels deep**

```ts
// apps/api/app/api/tenants/[slug]/modules/[moduleId]/deactivate/route.ts
import { jsonError, jsonOk, serverErrorLogged } from '../../../../../../../lib/api-response';
import { requireAdminAccess } from '../../../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../../../lib/constants';
import { upsertTenantModuleStatus } from '../../../../../../../lib/services/tenant-modules.service';
import { getModuleDefinition } from '../../../../../../../lib/tenant-modules/catalog';
import {
  ModuleIdParamSchema,
  TenantRefParamSchema,
  formatZodError,
} from '../../../../../../../lib/validation';

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; moduleId: string }> }
): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const { slug, moduleId } = await context.params;
  const slugParsed = TenantRefParamSchema.safeParse(slug);
  if (!slugParsed.success) {
    return jsonError(formatZodError(slugParsed.error), HTTP_STATUS.BAD_REQUEST);
  }
  const moduleParsed = ModuleIdParamSchema.safeParse(moduleId);
  if (!moduleParsed.success) {
    return jsonError(formatZodError(moduleParsed.error), HTTP_STATUS.BAD_REQUEST);
  }

  const mod = getModuleDefinition(moduleParsed.data);
  if (!mod) {
    return jsonError('Unknown module id', HTTP_STATUS.NOT_FOUND);
  }

  try {
    await upsertTenantModuleStatus(slugParsed.data, moduleParsed.data, 'disabled');
    return jsonOk({ status: 'disabled', manual_steps: mod.manual_steps });
  } catch (err) {
    return serverErrorLogged('POST deactivate tenant module:', err);
  }
}
```

- [ ] **Step 6: Write `[moduleId]/mark-manual-steps-done/route.ts` — 7 levels deep**

```ts
// apps/api/app/api/tenants/[slug]/modules/[moduleId]/mark-manual-steps-done/route.ts
import { jsonError, jsonOk, serverErrorLogged } from '../../../../../../../lib/api-response';
import { requireAdminAccess } from '../../../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../../../lib/constants';
import { upsertTenantModuleStatus } from '../../../../../../../lib/services/tenant-modules.service';
import {
  ModuleIdParamSchema,
  TenantRefParamSchema,
  formatZodError,
} from '../../../../../../../lib/validation';

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; moduleId: string }> }
): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const { slug, moduleId } = await context.params;
  const slugParsed = TenantRefParamSchema.safeParse(slug);
  if (!slugParsed.success) {
    return jsonError(formatZodError(slugParsed.error), HTTP_STATUS.BAD_REQUEST);
  }
  const moduleParsed = ModuleIdParamSchema.safeParse(moduleId);
  if (!moduleParsed.success) {
    return jsonError(formatZodError(moduleParsed.error), HTTP_STATUS.BAD_REQUEST);
  }

  try {
    await upsertTenantModuleStatus(slugParsed.data, moduleParsed.data, 'active');
    return jsonOk({ status: 'active' });
  } catch (err) {
    return serverErrorLogged('POST mark-manual-steps-done:', err);
  }
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run apps/api/app/api/tenants/[slug]/modules`
Expected: PASS (5 tests total across both files)

- [ ] **Step 8: Commit**

```bash
git add apps/api/app/api/tenants/[slug]/modules
git commit -m "feat(api): tenant module activation routes (GET list, activate, deactivate, mark-done)"
```

---

### Task 7: Admin API client + types

**Files:**
- Modify: `apps/admin/lib/types.ts`
- Modify: `apps/admin/lib/api-client.ts`

**Interfaces:**
- Produces:
  ```ts
  export type TenantModuleStatus = 'not_installed' | 'queued' | 'provisioning' | 'active' | 'active_needs_manual_steps' | 'failed' | 'disabled';
  export type TenantModule = { id: string; name: string; description: string; category: string; tier: string; required_by: string[]; requires: string[]; manual_steps: string[]; estimated_setup_minutes: number; cost_level: string; status: TenantModuleStatus; last_error: string | null };
  export type TenantModulesResponse = { modules: TenantModule[] };
  ```
  ```ts
  export async function getTenantModules(slug: string): Promise<TenantModulesResponse>;
  export async function activateTenantModule(slug: string, moduleId: string): Promise<{ status: string } | { error: string; missing_dependencies: string[] }>;
  export async function markManualStepsDone(slug: string, moduleId: string): Promise<{ status: string }>;
  ```

- [ ] **Step 1: Add types**

Append to `apps/admin/lib/types.ts`:

```ts
export type TenantModuleStatus =
  | 'not_installed'
  | 'queued'
  | 'provisioning'
  | 'active'
  | 'active_needs_manual_steps'
  | 'failed'
  | 'disabled';

export type TenantModule = {
  id: string;
  name: string;
  description: string;
  category: string;
  tier: string;
  required_by: string[];
  requires: string[];
  manual_steps: string[];
  estimated_setup_minutes: number;
  cost_level: string;
  status: TenantModuleStatus;
  last_error: string | null;
};

export type TenantModulesResponse = {
  modules: TenantModule[];
};
```

- [ ] **Step 2: Add client functions**

Append to `apps/admin/lib/api-client.ts` (near `getTenant`), importing `TenantModulesResponse` in the existing type-only import block at the top of the file:

```ts
export async function getTenantModules(slug: string): Promise<TenantModulesResponse> {
  return request<TenantModulesResponse>(`/api/tenants/${slug}/modules`);
}

export async function activateTenantModule(
  slug: string,
  moduleId: string
): Promise<{ status: string; error?: string; missing_dependencies?: string[] }> {
  return request(`/api/tenants/${slug}/modules/${moduleId}/activate`, { method: 'POST' });
}

export async function markManualStepsDone(
  slug: string,
  moduleId: string
): Promise<{ status: string }> {
  return request(`/api/tenants/${slug}/modules/${moduleId}/mark-manual-steps-done`, {
    method: 'POST',
  });
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p apps/admin/tsconfig.json`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/lib/types.ts apps/admin/lib/api-client.ts
git commit -m "feat(admin): API client + types for tenant module activation"
```

---

### Task 8: `useTenantModules` hook

**Files:**
- Create: `apps/admin/hooks/useTenantModules.ts`

**Interfaces:**
- Consumes: `getTenantModules` (Task 7).
- Produces: `useTenantModules(slug: string | undefined): { data: TenantModulesResponse | undefined; error: Error | undefined; isLoading: boolean; mutate: () => void }`.

- [ ] **Step 1: Write the hook**

```ts
// apps/admin/hooks/useTenantModules.ts
'use client';

import useSWR from 'swr';
import { getTenantModules } from '@/lib/api-client';
import type { TenantModulesResponse } from '@/lib/types';

const IN_PROGRESS_STATUSES = new Set(['queued', 'provisioning']);

export function useTenantModules(slug: string | undefined): {
  data: TenantModulesResponse | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mutate: () => void;
} {
  const { data, error, isLoading, mutate } = useSWR<TenantModulesResponse>(
    slug ? ['tenant-modules', slug] : null,
    () => getTenantModules(slug as string),
    {
      refreshInterval: (latest) => {
        const hasInProgress = latest?.modules.some((m) => IN_PROGRESS_STATUSES.has(m.status));
        return hasInProgress ? 5_000 : 30_000;
      },
      revalidateOnFocus: false,
    }
  );
  return { data, error: error as Error | undefined, isLoading, mutate };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p apps/admin/tsconfig.json`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/hooks/useTenantModules.ts
git commit -m "feat(admin): useTenantModules polling hook"
```

---

### Task 9: `ModulesCard` UI component

**Files:**
- Create: `apps/admin/components/tenants/ModulesCard.tsx`
- Modify: `apps/admin/app/tenants/[slug]/page.tsx`

**Interfaces:**
- Consumes: `useTenantModules` (Task 8), `activateTenantModule`/`markManualStepsDone` (Task 7), `Card`/`CardHeader`/`CardTitle`/`CardContent`/`Button` from `@/components/ui/*` (same imports as `ContainerStatusGrid.tsx`).

- [ ] **Step 1: Write the component**

```tsx
// apps/admin/components/tenants/ModulesCard.tsx
'use client';

import { useState } from 'react';
import { activateTenantModule, markManualStepsDone } from '@/lib/api-client';
import type { TenantModule } from '@/lib/types';
import { useTenantModules } from '@/hooks/useTenantModules';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_LABEL: Record<TenantModule['status'], string> = {
  not_installed: 'no instalado',
  queued: 'en cola',
  provisioning: 'provisionando…',
  active: 'activo',
  active_needs_manual_steps: 'activo — pasos manuales pendientes',
  failed: 'falló',
  disabled: 'desactivado',
};

function StatusBadge({ status }: { status: TenantModule['status'] }) {
  const color =
    status === 'active'
      ? 'text-ops-green'
      : status === 'failed'
        ? 'text-ops-red'
        : status === 'queued' || status === 'provisioning'
          ? 'text-ops-yellow'
          : 'text-ops-gray';
  return <span className={`font-mono text-xs ${color}`}>{STATUS_LABEL[status]}</span>;
}

function ModuleRow({
  slug,
  mod,
  onChanged,
}: {
  slug: string;
  mod: TenantModule;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const missingRequires = mod.requires; // full dependency check happens server-side; this is UI-only fast feedback
  const canActivate = mod.status === 'not_installed' || mod.status === 'failed';

  async function handleActivate(): Promise<void> {
    setBusy(true);
    try {
      await activateTenantModule(slug, mod.id);
      onChanged();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  async function handleMarkDone(): Promise<void> {
    setBusy(true);
    try {
      await markManualStepsDone(slug, mod.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-mono text-sm font-normal text-neutral-200">{mod.name}</CardTitle>
        <StatusBadge status={mod.status} />
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="font-sans text-xs text-ops-gray">{mod.description}</p>

        {mod.status === 'failed' && mod.last_error && (
          <p className="font-mono text-xs text-ops-red">{mod.last_error.slice(0, 300)}</p>
        )}

        {mod.status === 'active_needs_manual_steps' && (
          <div className="space-y-1">
            <ul className="list-disc pl-4 font-sans text-xs text-ops-gray">
              {mod.manual_steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => void handleMarkDone()}>
              Marcar completado
            </Button>
          </div>
        )}

        {canActivate && !confirming && (
          <Button
            size="sm"
            disabled={busy}
            title={missingRequires.length > 0 ? `Requiere: ${missingRequires.join(', ')}` : undefined}
            onClick={() => setConfirming(true)}
          >
            {mod.status === 'failed' ? 'Reintentar' : 'Activar'}
          </Button>
        )}

        {canActivate && confirming && (
          <div className="space-y-2 rounded border border-ops-yellow/40 p-2">
            <p className="font-sans text-xs text-neutral-300">
              Esto va a correr el script de bootstrap en el VPS (~{mod.estimated_setup_minutes} min,
              costo {mod.cost_level}).
            </p>
            {mod.manual_steps.length > 0 && (
              <p className="font-sans text-xs text-ops-gray">
                Después vas a tener que completar {mod.manual_steps.length} paso(s) manual(es).
              </p>
            )}
            <div className="flex gap-2">
              <Button size="sm" disabled={busy} onClick={() => void handleActivate()}>
                Confirmar
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ModulesCard({ slug }: { slug: string }) {
  const { data, isLoading, mutate } = useTenantModules(slug);

  if (isLoading || !data) {
    return null;
  }

  return (
    <div>
      <h2 className="mb-3 font-mono text-sm text-neutral-400">Módulos</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {data.modules.map((mod) => (
          <ModuleRow key={mod.id} slug={slug} mod={mod} onChanged={mutate} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into the tenant detail page**

In `apps/admin/app/tenants/[slug]/page.tsx`, import `ModulesCard` from `@/components/tenants/ModulesCard` and render it after the existing `<ContainerStatusGrid containers={containers} />` block (same section, before the closing `</div>` of the page's `space-y-8` wrapper):

```tsx
<ModulesCard slug={tenant.slug} />
```

- [ ] **Step 3: Manual verification**

Run the admin dev server (`npm run dev --workspace=apps/admin`, pointed at a local `apps/api`), open `/tenants/<a-real-slug>`, confirm the "Módulos" card renders with the 5 catalog modules and their current status.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/components/tenants/ModulesCard.tsx apps/admin/app/tenants/[slug]/page.tsx
git commit -m "feat(admin): render module activation card on tenant detail page"
```

---

### Task 10: Full verification pass

- [ ] **Step 1: Run the full API test suite**

Run: `npx vitest run --dir apps/api`
Expected: all tests pass, including the 4 new files from Tasks 2, 4, 5, 6.

- [ ] **Step 2: Type-check both apps**

Run: `npx tsc --noEmit -p apps/api/tsconfig.json && npx tsc --noEmit -p apps/admin/tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint apps/api/lib/tenant-modules apps/api/lib/services/tenant-modules.service.ts "apps/api/app/api/tenants/[slug]/modules" apps/admin/hooks/useTenantModules.ts apps/admin/components/tenants/ModulesCard.tsx`
Expected: no errors.

- [ ] **Step 4: Commit any lint fixes**

```bash
git add -u
git commit -m "chore: lint fixes for tenant module activation"
```
