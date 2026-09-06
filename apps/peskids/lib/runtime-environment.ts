/** Runtime environment and Supabase boundary checks for Peskids. */

export type PeskidsEnvironment = 'development' | 'staging' | 'production';

type RuntimeEnv = Record<string, string | undefined>;

/** Production Opsly/Peskids project. Staging must never resolve to this ref. */
export const PESKIDS_PRODUCTION_SUPABASE_PROJECT_REF = 'jkwykpldnitavhmtuzmo';

/** Isolated Opsly QA project. Use for Peskids staging only. */
export const PESKIDS_STAGING_SUPABASE_PROJECT_REF = 'hljetbbgiphpjbldebpo';

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

function currentSupabaseUrl(env: RuntimeEnv): string {
  return (
    env.SUPABASE_URL?.trim() ||
    env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    ''
  );
}

/**
 * Fails closed when a non-development runtime has no explicit DB target or
 * points at a target different from the one declared for that environment.
 * Values are compared as URLs only; secrets are never included in errors.
 */
export function assertPeskidsDatabaseBoundary(env: RuntimeEnv = process.env): void {
  const environment = resolvePeskidsEnvironment(env);
  if (environment === 'development') return;

  const actual = currentSupabaseUrl(env);
  const expected = env.PESKIDS_EXPECTED_SUPABASE_URL?.trim() || '';
  if (!actual || !expected) {
    throw new Error(
      `Peskids ${environment} requires SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and PESKIDS_EXPECTED_SUPABASE_URL`
    );
  }

  if (normalizeUrl(actual) !== normalizeUrl(expected)) {
    throw new Error(`Peskids ${environment} Supabase target does not match its declared environment`);
  }

  const productionUrl = env.PESKIDS_PRODUCTION_SUPABASE_URL?.trim();
  const stagingUrl = env.PESKIDS_STAGING_SUPABASE_URL?.trim();
  const actualRef = extractSupabaseProjectRef(actual);
  const productionRef =
    extractSupabaseProjectRef(productionUrl ?? '') ?? PESKIDS_PRODUCTION_SUPABASE_PROJECT_REF;

  if (environment === 'staging') {
    if (actualRef && actualRef === productionRef) {
      throw new Error('Peskids staging must not use the production Supabase project');
    }
    if (productionUrl && normalizeUrl(actual) === normalizeUrl(productionUrl)) {
      throw new Error('Peskids staging must not use the production Supabase project');
    }
  }
  if (environment === 'production' && stagingUrl && normalizeUrl(actual) === normalizeUrl(stagingUrl)) {
    throw new Error('Peskids production must not use the staging Supabase project');
  }
}

