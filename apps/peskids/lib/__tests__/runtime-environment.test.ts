import { describe, expect, it } from 'vitest';
import {
  assertPeskidsDatabaseBoundary,
  resolvePeskidsEnvironment,
} from '@/lib/runtime-environment';

describe('Peskids runtime environment boundary', () => {
  it('resolves explicit environment before deployment defaults', () => {
    expect(resolvePeskidsEnvironment({ PESKIDS_ENVIRONMENT: 'staging', NODE_ENV: 'production' })).toBe('staging');
    expect(resolvePeskidsEnvironment({ DOPPLER_CONFIG: 'prd' })).toBe('production');
    expect(resolvePeskidsEnvironment({ DOPPLER_CONFIG: 'stg' })).toBe('staging');
    expect(resolvePeskidsEnvironment({ DOPPLER_CONFIG: 'stg_peskids', NODE_ENV: 'production' })).toBe(
      'staging'
    );
  });

  it('accepts an isolated staging URL that is not the production project', () => {
    expect(() =>
      assertPeskidsDatabaseBoundary({
        PESKIDS_ENVIRONMENT: 'staging',
        SUPABASE_URL: 'https://hljetbbgiphpjbldebpo.supabase.co',
        PESKIDS_EXPECTED_SUPABASE_URL: 'https://hljetbbgiphpjbldebpo.supabase.co',
        PESKIDS_STAGING_SUPABASE_URL: 'https://hljetbbgiphpjbldebpo.supabase.co',
        PESKIDS_PRODUCTION_SUPABASE_URL: 'https://jkwykpldnitavhmtuzmo.supabase.co',
      })
    ).not.toThrow();
  });

  it('allows development without production target declarations', () => {
    expect(() => assertPeskidsDatabaseBoundary({ NODE_ENV: 'development' })).not.toThrow();
  });

  it('fails closed when staging has no explicit expected target', () => {
    expect(() =>
      assertPeskidsDatabaseBoundary({
        PESKIDS_ENVIRONMENT: 'staging',
        SUPABASE_URL: 'https://staging.supabase.co',
      })
    ).toThrow('PESKIDS_EXPECTED_SUPABASE_URL');
  });

  it('rejects a staging target that is the production project', () => {
    expect(() =>
      assertPeskidsDatabaseBoundary({
        PESKIDS_ENVIRONMENT: 'staging',
        SUPABASE_URL: 'https://prod.supabase.co',
        PESKIDS_EXPECTED_SUPABASE_URL: 'https://prod.supabase.co',
        PESKIDS_PRODUCTION_SUPABASE_URL: 'https://prod.supabase.co',
      })
    ).toThrow('production Supabase project');
  });

  it('rejects the known production project ref even without a sentinel URL', () => {
    expect(() =>
      assertPeskidsDatabaseBoundary({
        PESKIDS_ENVIRONMENT: 'staging',
        SUPABASE_URL: 'https://jkwykpldnitavhmtuzmo.supabase.co',
        PESKIDS_EXPECTED_SUPABASE_URL: 'https://jkwykpldnitavhmtuzmo.supabase.co',
      })
    ).toThrow('production Supabase project');
  });

  it('rejects an expected target mismatch without exposing secrets', () => {
    expect(() =>
      assertPeskidsDatabaseBoundary({
        PESKIDS_ENVIRONMENT: 'production',
        SUPABASE_URL: 'https://staging.supabase.co',
        PESKIDS_EXPECTED_SUPABASE_URL: 'https://prod.supabase.co',
      })
    ).toThrow('does not match');
  });
});

