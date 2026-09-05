/**
 * Peskids server-side environment boundary.
 *
 * Goal: it must be impossible to run the staging deployment against the
 * production database (or the reverse) without the process refusing to start.
 *
 * Design rules enforced here:
 *
 * 1. The environment is chosen **server side only**. It is read from
 *    `PESKIDS_APP_ENV` (or derived from `DOPPLER_CONFIG` / `NODE_ENV`). No
 *    `NEXT_PUBLIC_*` variable may name the environment, because anything with
 *    that prefix is inlined into the browser bundle and is therefore
 *    attacker-controlled at runtime (`?env=prod` style switching).
 * 2. The Supabase project the app talks to is pinned per environment. The
 *    production project ref is declared once in
 *    `PESKIDS_PRODUCTION_SUPABASE_PROJECT_REF`; any non-production environment
 *    that resolves to that ref fails closed, and production that resolves to a
 *    different ref fails closed too.
 *    Because `NEXT_PUBLIC_SUPABASE_URL` is what gets inlined into the client
 *    bundle, this check is also what guarantees "no production DB URL reachable
 *    from the staging frontend bundle".
 * 3. The public origin is pinned the same way: a staging build may not advertise
 *    the production hostname.
 *
 * Everything is a pure function over a `ProcessEnv` so it can be unit tested
 * without touching the real process environment.
 */

export const APP_ENVIRONMENTS = ['development', 'staging', 'production'] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

/** Server-only variable that names the environment. Never `NEXT_PUBLIC_`. */
export const APP_ENV_VAR = 'PESKIDS_APP_ENV';

/** Declares which Supabase project ref is production. */
export const PRODUCTION_PROJECT_REF_VAR = 'PESKIDS_PRODUCTION_SUPABASE_PROJECT_REF';

/** Comma-separated hostnames that only production may serve. */
export const PRODUCTION_HOSTS_VAR = 'PESKIDS_PRODUCTION_HOSTS';

const DEFAULT_PRODUCTION_HOSTS = ['www.peskids.com', 'peskids.com'];

/**
 * `NEXT_PUBLIC_` names that would let the browser bundle carry (and therefore a
 * client override) the environment. Their presence is a hard failure.
 */
const FORBIDDEN_PUBLIC_ENV_PATTERN = /^NEXT_PUBLIC_.*(APP_ENV|ENVIRONMENT|DEPLOY_ENV|RUNTIME_ENV)$/;

export type EnvironmentBoundaryViolation = {
  code:
    | 'unknown_environment'
    | 'browser_selectable_environment'
    | 'missing_supabase_url'
    | 'malformed_supabase_url'
    | 'production_db_outside_production'
    | 'production_not_using_production_db'
    | 'production_host_outside_production'
    | 'missing_production_ref';
  message: string;
};

export type EnvironmentBoundaryResult =
  | { ok: true; environment: AppEnvironment; supabaseProjectRef: string | null }
  | {
      ok: false;
      environment: AppEnvironment;
      supabaseProjectRef: string | null;
      violations: EnvironmentBoundaryViolation[];
    };

export class EnvironmentBoundaryError extends Error {
  readonly code = 'ENVIRONMENT_BOUNDARY';
  readonly violations: EnvironmentBoundaryViolation[];

  constructor(violations: EnvironmentBoundaryViolation[]) {
    super(
      `Peskids environment boundary check failed:\n` +
        violations.map((violation) => `  - [${violation.code}] ${violation.message}`).join('\n')
    );
    this.name = 'EnvironmentBoundaryError';
    this.violations = violations;
  }
}

function normalize(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function isAppEnvironment(value: string): value is AppEnvironment {
  return (APP_ENVIRONMENTS as readonly string[]).includes(value);
}

/**
 * Resolves the environment from server-side signals only.
 * Returns `null` when nothing usable is configured (caller decides how loud to be).
 */
export function resolveAppEnvironment(
  env: NodeJS.ProcessEnv = process.env
): AppEnvironment | null {
  const explicit = normalize(env[APP_ENV_VAR]);
  if (explicit) {
    if (isAppEnvironment(explicit)) return explicit;
    if (explicit === 'dev' || explicit === 'local') return 'development';
    if (explicit === 'stg' || explicit === 'stage' || explicit === 'qa') return 'staging';
    if (explicit === 'prd' || explicit === 'prod') return 'production';
    return null;
  }

  const doppler = normalize(env.DOPPLER_CONFIG);
  if (doppler === 'prd' || doppler === 'prod' || doppler === 'production') return 'production';
  if (doppler === 'stg' || doppler === 'staging' || doppler === 'qa') return 'staging';
  if (doppler === 'dev' || doppler === 'development' || doppler === 'local') return 'development';

  const nodeEnv = normalize(env.NODE_ENV);
  if (nodeEnv === 'production') return 'production';
  if (nodeEnv === 'test' || nodeEnv === 'development' || nodeEnv === '') return 'development';

  return null;
}

/** Convenience: resolved environment, defaulting to the safest interpretation. */
export function currentEnvironment(env: NodeJS.ProcessEnv = process.env): AppEnvironment {
  return resolveAppEnvironment(env) ?? 'development';
}

export function isProduction(env: NodeJS.ProcessEnv = process.env): boolean {
  return currentEnvironment(env) === 'production';
}

/** `https://abc123.supabase.co` → `abc123`. Returns null for self-hosted/unparseable URLs. */
export function supabaseProjectRefFromUrl(url: string | undefined): string | null {
  if (!url || url.trim().length === 0) return null;
  let host: string;
  try {
    host = new URL(url.trim()).hostname;
  } catch {
    return null;
  }
  const match = /^([a-z0-9-]+)\.supabase\.(co|in|net)$/i.exec(host);
  return match ? match[1].toLowerCase() : null;
}

function publicHostname(url: string | undefined): string | null {
  if (!url || url.trim().length === 0) return null;
  try {
    return new URL(url.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function productionHosts(env: NodeJS.ProcessEnv): string[] {
  const raw = env[PRODUCTION_HOSTS_VAR];
  if (!raw || raw.trim().length === 0) return DEFAULT_PRODUCTION_HOSTS;
  return raw
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter((host) => host.length > 0);
}

/**
 * Names of `NEXT_PUBLIC_` variables that would let the browser bundle select the
 * environment. Exported so a test can assert the deployment stays clean.
 */
export function browserSelectableEnvironmentKeys(env: NodeJS.ProcessEnv = process.env): string[] {
  return Object.keys(env).filter((key) => FORBIDDEN_PUBLIC_ENV_PATTERN.test(key));
}

/**
 * Pure boundary check. Never throws — returns the violations so both the startup
 * assertion and the health endpoint can use it.
 */
export function checkEnvironmentBoundary(
  env: NodeJS.ProcessEnv = process.env
): EnvironmentBoundaryResult {
  const violations: EnvironmentBoundaryViolation[] = [];
  const resolved = resolveAppEnvironment(env);
  const environment = resolved ?? 'development';

  if (resolved === null) {
    violations.push({
      code: 'unknown_environment',
      message:
        `Could not resolve the runtime environment. Set ${APP_ENV_VAR} to one of ` +
        `${APP_ENVIRONMENTS.join(' | ')} (server-side only).`,
    });
  }

  const publicEnvKeys = browserSelectableEnvironmentKeys(env);
  if (publicEnvKeys.length > 0) {
    violations.push({
      code: 'browser_selectable_environment',
      message:
        `The environment must not be selectable from the browser bundle. ` +
        `Remove: ${publicEnvKeys.join(', ')}. Use ${APP_ENV_VAR} instead.`,
    });
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim() || env.SUPABASE_URL?.trim();
  const supabaseProjectRef = supabaseProjectRefFromUrl(supabaseUrl);

  if (!supabaseUrl) {
    violations.push({
      code: 'missing_supabase_url',
      message: 'NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) is not configured.',
    });
  } else if (supabaseProjectRef === null) {
    // Self-hosted Supabase is legitimate, but then the boundary cannot be
    // machine-checked, so it must be declared explicitly.
    if (normalize(env.PESKIDS_ALLOW_UNPINNED_SUPABASE) !== 'true') {
      violations.push({
        code: 'malformed_supabase_url',
        message:
          `Supabase URL "${supabaseUrl}" is not a *.supabase.co project URL, so the ` +
          `environment boundary cannot be verified. Set PESKIDS_ALLOW_UNPINNED_SUPABASE=true ` +
          `only for local/self-hosted development.`,
      });
    }
  }

  const productionRef = normalize(env[PRODUCTION_PROJECT_REF_VAR]);

  if (!productionRef) {
    // Without the declaration there is nothing to compare against. That is
    // tolerable in development, but never in staging or production.
    if (environment !== 'development') {
      violations.push({
        code: 'missing_production_ref',
        message:
          `${PRODUCTION_PROJECT_REF_VAR} is not set, so a ${environment} deployment cannot ` +
          `prove it is not pointed at the production database.`,
      });
    }
  } else if (supabaseProjectRef !== null) {
    if (environment !== 'production' && supabaseProjectRef === productionRef) {
      violations.push({
        code: 'production_db_outside_production',
        message:
          `Environment is "${environment}" but Supabase project "${supabaseProjectRef}" is the ` +
          `production database. Refusing to start.`,
      });
    }
    if (environment === 'production' && supabaseProjectRef !== productionRef) {
      violations.push({
        code: 'production_not_using_production_db',
        message:
          `Environment is "production" but Supabase project "${supabaseProjectRef}" is not the ` +
          `declared production database ("${productionRef}"). Refusing to start.`,
      });
    }
  }

  if (environment !== 'production') {
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

    if (offending.length > 0) {
      violations.push({
        code: 'production_host_outside_production',
        message:
          `Environment is "${environment}" but a public origin advertises the production ` +
          `hostname(s): ${[...new Set(offending)].join(', ')}.`,
      });
    }
  }

  if (violations.length > 0) {
    return { ok: false, environment, supabaseProjectRef, violations };
  }
  return { ok: true, environment, supabaseProjectRef };
}

/** Fail-closed startup assertion. Throws `EnvironmentBoundaryError` on any violation. */
export function assertEnvironmentBoundary(env: NodeJS.ProcessEnv = process.env): AppEnvironment {
  const result = checkEnvironmentBoundary(env);
  if (!result.ok) {
    throw new EnvironmentBoundaryError(result.violations);
  }
  return result.environment;
}
