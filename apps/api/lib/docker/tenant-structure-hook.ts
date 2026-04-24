import { readFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { getTenantsBaseDir } from './paths';

type TenantStructureInput = {
  slug: string;
  composePath: string;
};

type TenantStructureHookResult = {
  ok: boolean;
  errors: string[];
};

function assertPathInsideTenantsDir(composePath: string): void {
  const tenantsDir = resolve(getTenantsBaseDir());
  const absoluteComposePath = resolve(composePath);
  const relativePath = relative(tenantsDir, absoluteComposePath);
  const isOutside =
    relativePath === '' || relativePath.startsWith('..') || relativePath.startsWith(`..${sep}`);

  if (isOutside) {
    throw new Error(
      `Tenant structure hook failed: compose path is outside PLATFORM_TENANTS_DIR (${absoluteComposePath})`
    );
  }
}

function assertComposePathNaming(slug: string, composePath: string): void {
  const expectedSuffix = `${sep}${slug}${sep}docker-compose.yml`;
  if (!composePath.endsWith(expectedSuffix)) {
    throw new Error(
      `Tenant structure hook failed: unexpected compose file location for slug "${slug}" (${composePath})`
    );
  }
}

function assertComposeContentNaming(slug: string, composeContent: string): void {
  const requiredFragments = [
    `container_name: n8n_${slug}`,
    `container_name: uptime_${slug}`,
    `Host(\`n8n-${slug}.`,
    `Host(\`uptime-${slug}.`,
  ];

  const missing = requiredFragments.filter((fragment) => !composeContent.includes(fragment));
  if (missing.length > 0) {
    throw new Error(
      `Tenant structure hook failed: compose file missing required fragments (${missing.join(', ')})`
    );
  }
}

/**
 * Guardrail hook that prevents onboarding from continuing when the tenant
 * compose structure does not match expected conventions.
 */
export async function runTenantStructureHook(input: TenantStructureInput): Promise<void> {
  assertPathInsideTenantsDir(input.composePath);
  assertComposePathNaming(input.slug, input.composePath);

  const composeContent = await readFile(input.composePath, 'utf8');
  assertComposeContentNaming(input.slug, composeContent);
}

function parseBooleanEnv(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

/**
 * Fail-open validator for tenant compose structure.
 * - strict=false (default): returns errors but does not throw, so onboarding keeps moving.
 * - strict=true: throws on first structural issue.
 */
export async function runTenantStructureHookSafe(
  input: TenantStructureInput
): Promise<TenantStructureHookResult> {
  const strictMode = parseBooleanEnv(process.env.TENANT_STRUCTURE_HOOK_STRICT);
  const errors: string[] = [];

  try {
    await runTenantStructureHook(input);
    return { ok: true, errors };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Tenant structure hook failed with unknown error';
    errors.push(message);
  }

  if (strictMode) {
    throw new Error(errors.join('; '));
  }

  return { ok: false, errors };
}
