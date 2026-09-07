/**
 * Runtime environment and Supabase boundary checks for Peskids.
 *
 * Single canonical module for "is this process staging or production, and is
 * it pointed at the right database" — previously split across two competing
 * implementations (this file, used by the health route/canonical DB client
 * since #1093/#1094, and a second `lib/runtime/environment.ts` written in
 * parallel by a different work stream). Consolidated so there is exactly one
 * place this guarantee can drift.
 */

export type PeskidsEnvironment = 'development' | 'staging' | 'production';

type RuntimeEnv = Record<string, string | undefined>;

/** Production Opsly/Peskids project. Staging must never resolve to this ref. */
export const PESKIDS_PRODUCTION_SUPABASE_PROJECT_REF = 'jkwykpldnitavhmtuzmo';

/** Isolated Opsly QA project. Use for Peskids staging only. */
export const PESKIDS_STAGING_SUPABASE_PROJECT_REF = 'hljetbbgiphpjbldebpo';

/** Comma-separated hostnames that only production may serve. */
export const PRODUCTION_HOSTS_VAR = 'PESKIDS_PRODUCTION_HOSTS';

const DEFAULT_PRODUCTION_HOSTS = ['www.peskids.com', 'peskids.com'];

/**
 * `NEXT_PUBLIC_` names that would let the browser bundle carry (and therefore
 * let a client override) the environment. Their presence is a hard failure:
 * anything with that prefix is inlined into the browser bundle and is
 * therefore attacker-controlled at runtime (`?env=prod` style switching).
 */
const FORBIDDEN_PUBLIC_ENV_PATTERN = /^NEXT_PUBLIC_.*(APP_ENV|ENVIRONMENT|DEPLOY_ENV|RUNTIME_ENV)$/;

export type EnvironmentBoundaryViolation = {
  code:
    | 'missing_supabase_url'
    | 'target_mismatch'
    | 'staging_using_production_db'
    | 'production_using_staging_db'
    | 'browser_selectable_environment'
    | 'production_host_outside_production';
  message: string;
};

export type EnvironmentBoundaryResult =
  | { ok: true; environment: PeskidsEnvironment; supabaseProjectRef: string | null }
  | {
      ok: false;
      environment: PeskidsEnvironment;
      supabaseProjectRef: string | null;
      violations: EnvironmentBoundaryViolation[];
    };

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/$/, '').toLowerCase();
}

export function extractSupabaseProjectRef(url: string): string | null {
  const match = url.trim().match(/^https:\/\/([a-z0-9]+)\.supabase\.(?:co|in)\b/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function resolvePeskidsEnvironment(env: RuntimeEnv = process.env): PeskidsEnvironment {
  const explicit = env.PESKIDS_ENVIRONMENT?.trim().toLowerCase();
  if (explicit === 'development' || explicit === 'staging' || explicit === 'production') {
    return explicit;
  }

  const config = env.DOPPLER_CONFIG?.trim().toLowerCase() ?? '';
  if (config === 'prd' || config === 'prod' || config === 'production') return 'production';
  // stg_peskids is the Peskids QA Doppler config. Bare `stg` is Smile — still
  // treat it as non-prod so a miswired container fails the URL boundary, not
  // by being classified as production.
  if (
    config === 'stg' ||
    config === 'staging' ||
    config === 'qa' ||
    config === 'stg_peskids' ||
    config === 'stg_qa' ||
    config.startsWith('stg_')
  ) {
    return 'staging';
  }
  return env.NODE_ENV?.trim().toLowerCase() === 'production' ? 'production' : 'development';
}

/** Convenience alias: same resolution, name matches call sites migrated off the old module. */
export const currentEnvironment = resolvePeskidsEnvironment;

export function isProduction(env: RuntimeEnv = process.env): boolean {
  return resolvePeskidsEnvironment(env) === 'production';
}

function currentSupabaseUrl(env: RuntimeEnv): string {
  return env.SUPABASE_URL?.trim() || env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
}

/**
 * Names of `NEXT_PUBLIC_` variables that would let the browser bundle select
 * the environment. Exported so a test can assert the deployment stays clean.
 */
export function browserSelectableEnvironmentKeys(env: RuntimeEnv = process.env): string[] {
  return Object.keys(env).filter((key) => FORBIDDEN_PUBLIC_ENV_PATTERN.test(key));
}

function productionHosts(env: RuntimeEnv): string[] {
  const raw = env[PRODUCTION_HOSTS_VAR];
  if (!raw || raw.trim().length === 0) return DEFAULT_PRODUCTION_HOSTS;
  return raw
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter((host) => host.length > 0);
}

function publicHostname(url: string | undefined): string | null {
  if (!url || url.trim().length === 0) return null;
  try {
    return new URL(url.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Collects every boundary violation without throwing, so both the fail-closed
 * assertion and the health endpoint (which wants to report *all* problems, not
 * just the first) can share one source of truth.
 */
function collectBoundaryViolations(env: RuntimeEnv): EnvironmentBoundaryViolation[] {
  const violations: EnvironmentBoundaryViolation[] = [];
  const environment = resolvePeskidsEnvironment(env);

  const publicEnvKeys = browserSelectableEnvironmentKeys(env);
  if (publicEnvKeys.length > 0) {
    violations.push({
      code: 'browser_selectable_environment',
      message:
        `The environment must not be selectable from the browser bundle. ` +
        `Remove: ${publicEnvKeys.join(', ')}. Use PESKIDS_ENVIRONMENT instead.`,
    });
  }

  if (environment !== 'development') {
    const hosts = productionHosts(env);
    const publicUrls = [
      env.PESKIDS_PUBLIC_URL,
      env.NEXT_PUBLIC_PESKIDS_SITE_URL,
      env.NEXT_PUBLIC_SITE_URL,
      env.NEXT_PUBLIC_APP_URL,
      env.NEXT_PUBLIC_PESKIDS_URL,
    ];
    const offending = publicUrls
      .map((url) => publicHostname(url))
      .filter((host): host is string => host !== null && hosts.includes(host));

    if (environment !== 'production' && offending.length > 0) {
      violations.push({
        code: 'production_host_outside_production',
        message:
          `Environment is "${environment}" but a public origin advertises the production ` +
          `hostname(s): ${[...new Set(offending)].join(', ')}.`,
      });
    }
  }

  if (environment === 'development') {
    return violations;
  }

  const actual = currentSupabaseUrl(env);
  const expected = env.PESKIDS_EXPECTED_SUPABASE_URL?.trim() || '';
  if (!actual || !expected) {
    violations.push({
      code: 'missing_supabase_url',
      message: `Peskids ${environment} requires SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and PESKIDS_EXPECTED_SUPABASE_URL`,
    });
    return violations;
  }

  if (normalizeUrl(actual) !== normalizeUrl(expected)) {
    violations.push({
      code: 'target_mismatch',
      message: `Peskids ${environment} Supabase target does not match its declared environment`,
    });
  }

  const productionUrl = env.PESKIDS_PRODUCTION_SUPABASE_URL?.trim();
  const stagingUrl = env.PESKIDS_STAGING_SUPABASE_URL?.trim();
  const actualRef = extractSupabaseProjectRef(actual);
  const productionRef =
    extractSupabaseProjectRef(productionUrl ?? '') ?? PESKIDS_PRODUCTION_SUPABASE_PROJECT_REF;

  if (environment === 'staging') {
    const pointsAtProduction =
      (actualRef && actualRef === productionRef) ||
      (productionUrl !== undefined && normalizeUrl(actual) === normalizeUrl(productionUrl));
    if (pointsAtProduction) {
      violations.push({
        code: 'staging_using_production_db',
        message: 'Peskids staging must not use the production Supabase project',
      });
    }
  }
  if (environment === 'production' && stagingUrl && normalizeUrl(actual) === normalizeUrl(stagingUrl)) {
    violations.push({
      code: 'production_using_staging_db',
      message: 'Peskids production must not use the staging Supabase project',
    });
  }

  return violations;
}

/**
 * Pure boundary check. Never throws — returns the violations so both the
 * startup assertion and the health endpoint can use it. Only the environment
 * name and violation codes are meant to be exposed externally; messages can
 * mention hostnames and must never carry secrets.
 */
export function checkEnvironmentBoundary(env: RuntimeEnv = process.env): EnvironmentBoundaryResult {
  const environment = resolvePeskidsEnvironment(env);
  const supabaseProjectRef = extractSupabaseProjectRef(currentSupabaseUrl(env));
  const violations = collectBoundaryViolations(env);
  if (violations.length > 0) {
    return { ok: false, environment, supabaseProjectRef, violations };
  }
  return { ok: true, environment, supabaseProjectRef };
}

/**
 * Fails closed when a non-development runtime has no explicit DB target,
 * points at a target different from the one declared for that environment, or
 * trips the browser-selectable-environment / production-hostname checks.
 * Values are compared as URLs only; secrets are never included in errors.
 */
export function assertPeskidsDatabaseBoundary(env: RuntimeEnv = process.env): void {
  const result = checkEnvironmentBoundary(env);
  if (!result.ok) {
    throw new Error(result.violations.map((violation) => violation.message).join('; '));
  }
}
