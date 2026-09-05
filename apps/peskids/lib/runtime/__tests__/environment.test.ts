import { describe, expect, it } from 'vitest';
import {
  APP_ENV_VAR,
  EnvironmentBoundaryError,
  PRODUCTION_PROJECT_REF_VAR,
  assertEnvironmentBoundary,
  browserSelectableEnvironmentKeys,
  checkEnvironmentBoundary,
  currentEnvironment,
  resolveAppEnvironment,
  supabaseProjectRefFromUrl,
} from '../environment';

const PROD_REF = 'jkwykpldnitavhmtuzmo';
const STAGING_REF = 'stagingprojectref01';

function env(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const base: Record<string, string> = {
    NODE_ENV: 'production',
    [APP_ENV_VAR]: 'staging',
    NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_REF}.supabase.co`,
    [PRODUCTION_PROJECT_REF_VAR]: PROD_REF,
    NEXT_PUBLIC_PESKIDS_SITE_URL: 'https://peskids.op-sly.com',
  };
  const merged: Record<string, string | undefined> = { ...base, ...overrides };
  for (const key of Object.keys(merged)) {
    if (merged[key] === undefined) delete merged[key];
  }
  return merged as NodeJS.ProcessEnv;
}

describe('resolveAppEnvironment', () => {
  it('prefers the explicit server-side variable', () => {
    expect(resolveAppEnvironment({ [APP_ENV_VAR]: 'production' } as unknown as NodeJS.ProcessEnv)).toBe(
      'production'
    );
    expect(resolveAppEnvironment({ [APP_ENV_VAR]: 'STAGING' } as unknown as NodeJS.ProcessEnv)).toBe('staging');
  });

  it('accepts the Doppler config aliases', () => {
    expect(resolveAppEnvironment({ [APP_ENV_VAR]: 'prd' } as unknown as NodeJS.ProcessEnv)).toBe('production');
    expect(resolveAppEnvironment({ [APP_ENV_VAR]: 'qa' } as unknown as NodeJS.ProcessEnv)).toBe('staging');
  });

  it('falls back to DOPPLER_CONFIG then NODE_ENV', () => {
    expect(resolveAppEnvironment({ DOPPLER_CONFIG: 'prd' } as unknown as NodeJS.ProcessEnv)).toBe('production');
    expect(resolveAppEnvironment({ DOPPLER_CONFIG: 'stg' } as unknown as NodeJS.ProcessEnv)).toBe('staging');
    expect(resolveAppEnvironment({ NODE_ENV: 'production' } as unknown as NodeJS.ProcessEnv)).toBe(
      'production'
    );
    expect(resolveAppEnvironment({ NODE_ENV: 'development' } as unknown as NodeJS.ProcessEnv)).toBe(
      'development'
    );
  });

  it('returns null for an unrecognised explicit value rather than guessing', () => {
    expect(resolveAppEnvironment({ [APP_ENV_VAR]: 'prod-eu-2' } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });

  it('never reads a NEXT_PUBLIC_ variable to pick the environment', () => {
    const resolved = resolveAppEnvironment({
      NEXT_PUBLIC_APP_ENV: 'production',
      NODE_ENV: 'development',
    } as unknown as NodeJS.ProcessEnv);
    expect(resolved).toBe('development');
  });

  it('defaults to development when nothing is configured', () => {
    expect(currentEnvironment({} as unknown as NodeJS.ProcessEnv)).toBe('development');
  });
});

describe('supabaseProjectRefFromUrl', () => {
  it('extracts the project ref', () => {
    expect(supabaseProjectRefFromUrl(`https://${PROD_REF}.supabase.co`)).toBe(PROD_REF);
    expect(supabaseProjectRefFromUrl(`https://${PROD_REF}.supabase.co/rest/v1`)).toBe(PROD_REF);
  });

  it('returns null for self-hosted or invalid URLs', () => {
    expect(supabaseProjectRefFromUrl('http://localhost:54321')).toBeNull();
    expect(supabaseProjectRefFromUrl('not a url')).toBeNull();
    expect(supabaseProjectRefFromUrl(undefined)).toBeNull();
  });
});

describe('checkEnvironmentBoundary', () => {
  it('passes for a correctly pinned staging deployment', () => {
    const result = checkEnvironmentBoundary(env());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.environment).toBe('staging');
      expect(result.supabaseProjectRef).toBe(STAGING_REF);
    }
  });

  it('passes for a correctly pinned production deployment', () => {
    const result = checkEnvironmentBoundary(
      env({
        [APP_ENV_VAR]: 'production',
        NEXT_PUBLIC_SUPABASE_URL: `https://${PROD_REF}.supabase.co`,
        NEXT_PUBLIC_PESKIDS_SITE_URL: 'https://www.peskids.com',
      })
    );
    expect(result.ok).toBe(true);
  });

  it('REJECTS staging pointed at the production database', () => {
    const result = checkEnvironmentBoundary(
      env({ NEXT_PUBLIC_SUPABASE_URL: `https://${PROD_REF}.supabase.co` })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations.map((v) => v.code)).toContain('production_db_outside_production');
    }
  });

  it('REJECTS production pointed at a non-production database', () => {
    const result = checkEnvironmentBoundary(
      env({
        [APP_ENV_VAR]: 'production',
        NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_REF}.supabase.co`,
        NEXT_PUBLIC_PESKIDS_SITE_URL: 'https://www.peskids.com',
      })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations.map((v) => v.code)).toContain(
        'production_not_using_production_db'
      );
    }
  });

  it('REJECTS a NEXT_PUBLIC_ variable that would let the browser pick the environment', () => {
    const result = checkEnvironmentBoundary(env({ NEXT_PUBLIC_APP_ENV: 'production' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations.map((v) => v.code)).toContain('browser_selectable_environment');
    }
  });

  it('REJECTS staging advertising the production hostname', () => {
    const result = checkEnvironmentBoundary(
      env({ NEXT_PUBLIC_PESKIDS_SITE_URL: 'https://www.peskids.com' })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations.map((v) => v.code)).toContain(
        'production_host_outside_production'
      );
    }
  });

  it('REJECTS staging/production that has not declared the production project ref', () => {
    const result = checkEnvironmentBoundary(env({ [PRODUCTION_PROJECT_REF_VAR]: undefined }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations.map((v) => v.code)).toContain('missing_production_ref');
    }
  });

  it('allows an undeclared production ref in development only', () => {
    const result = checkEnvironmentBoundary({
      [APP_ENV_VAR]: 'development',
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      PESKIDS_ALLOW_UNPINNED_SUPABASE: 'true',
    } as unknown as NodeJS.ProcessEnv);
    expect(result.ok).toBe(true);
  });

  it('REJECTS an unpinnable Supabase URL unless explicitly opted out', () => {
    const result = checkEnvironmentBoundary(
      env({ NEXT_PUBLIC_SUPABASE_URL: 'https://db.internal.example.com' })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations.map((v) => v.code)).toContain('malformed_supabase_url');
    }
  });

  it('REJECTS an unresolvable environment name', () => {
    const result = checkEnvironmentBoundary(env({ [APP_ENV_VAR]: 'prod-eu-2' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations.map((v) => v.code)).toContain('unknown_environment');
    }
  });
});

describe('assertEnvironmentBoundary', () => {
  it('returns the environment when the boundary holds', () => {
    expect(assertEnvironmentBoundary(env())).toBe('staging');
  });

  it('throws EnvironmentBoundaryError (fail closed) on a mismatch', () => {
    expect(() =>
      assertEnvironmentBoundary(env({ NEXT_PUBLIC_SUPABASE_URL: `https://${PROD_REF}.supabase.co` }))
    ).toThrow(EnvironmentBoundaryError);
  });

  it('does not leak the database URL or any secret in the thrown message', () => {
    try {
      assertEnvironmentBoundary(
        env({
          NEXT_PUBLIC_SUPABASE_URL: `https://${PROD_REF}.supabase.co`,
          SUPABASE_SERVICE_ROLE_KEY: 'super-secret-service-role-key',
        })
      );
      throw new Error('expected the boundary assertion to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvironmentBoundaryError);
      const message = (error as Error).message;
      expect(message).not.toContain('super-secret-service-role-key');
      expect(message).not.toContain('https://');
    }
  });
});

describe('browserSelectableEnvironmentKeys', () => {
  it('flags every NEXT_PUBLIC_ variable that names an environment', () => {
    const keys = browserSelectableEnvironmentKeys({
      NEXT_PUBLIC_APP_ENV: 'x',
      NEXT_PUBLIC_PESKIDS_DEPLOY_ENV: 'x',
      NEXT_PUBLIC_SUPABASE_URL: 'x',
      PESKIDS_APP_ENV: 'x',
    } as unknown as NodeJS.ProcessEnv);
    expect(keys.sort()).toEqual(['NEXT_PUBLIC_APP_ENV', 'NEXT_PUBLIC_PESKIDS_DEPLOY_ENV']);
  });
});
