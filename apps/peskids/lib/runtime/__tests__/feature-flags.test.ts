import { describe, expect, it } from 'vitest';
import {
  FRANCHISE_OS_GATE,
  FRANCHISE_ROYALTIES_GATE,
  ModuleDisabledError,
  assertModuleEnabled,
  isModuleEnabled,
  moduleAvailability,
} from '../feature-flags';

function env(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
  return overrides as NodeJS.ProcessEnv;
}

describe('module gates', () => {
  it('defaults to closed when nothing is configured', () => {
    expect(isModuleEnabled(FRANCHISE_OS_GATE, env())).toBe(false);
    expect(isModuleEnabled(FRANCHISE_ROYALTIES_GATE, env())).toBe(false);
  });

  it('opens outside production when only the flag is on', () => {
    const result = moduleAvailability(
      FRANCHISE_ROYALTIES_GATE,
      env({ PESKIDS_ENVIRONMENT: 'staging', PESKIDS_FRANCHISE_ROYALTIES_ENABLED: 'true' })
    );
    expect(result).toEqual({ available: true });
  });

  it('stays closed in production when only the flag is on', () => {
    const result = moduleAvailability(
      FRANCHISE_ROYALTIES_GATE,
      env({ PESKIDS_ENVIRONMENT: 'production', PESKIDS_FRANCHISE_ROYALTIES_ENABLED: 'true' })
    );
    expect(result).toEqual({ available: false, reason: 'not_production_ready' });
  });

  it('opens in production only when explicitly certified', () => {
    const result = moduleAvailability(
      FRANCHISE_ROYALTIES_GATE,
      env({
        PESKIDS_ENVIRONMENT: 'production',
        PESKIDS_FRANCHISE_ROYALTIES_ENABLED: 'true',
        PESKIDS_FRANCHISE_ROYALTIES_PRODUCTION_READY: 'true',
      })
    );
    expect(result).toEqual({ available: true });
  });

  it('treats a production-ready flag alone as still closed', () => {
    const result = moduleAvailability(
      FRANCHISE_ROYALTIES_GATE,
      env({
        PESKIDS_ENVIRONMENT: 'production',
        PESKIDS_FRANCHISE_ROYALTIES_PRODUCTION_READY: 'true',
      })
    );
    expect(result).toEqual({ available: false, reason: 'flag_off' });
  });

  it('detects production from DOPPLER_CONFIG and NODE_ENV too', () => {
    expect(
      moduleAvailability(
        FRANCHISE_ROYALTIES_GATE,
        env({ DOPPLER_CONFIG: 'prd', PESKIDS_FRANCHISE_ROYALTIES_ENABLED: 'true' })
      )
    ).toEqual({ available: false, reason: 'not_production_ready' });

    expect(
      moduleAvailability(
        FRANCHISE_ROYALTIES_GATE,
        env({ NODE_ENV: 'production', PESKIDS_FRANCHISE_ROYALTIES_ENABLED: 'true' })
      )
    ).toEqual({ available: false, reason: 'not_production_ready' });
  });

  it('ignores garbage flag values instead of opening the gate', () => {
    expect(
      isModuleEnabled(FRANCHISE_OS_GATE, env({ PESKIDS_FRANCHISE_OS_ENABLED: 'maybe' }))
    ).toBe(false);
  });

  it('assertModuleEnabled throws a 503-shaped error when closed', () => {
    try {
      assertModuleEnabled(FRANCHISE_OS_GATE, env({ PESKIDS_ENVIRONMENT: 'production' }));
      throw new Error('expected assertModuleEnabled to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ModuleDisabledError);
      expect((error as ModuleDisabledError).status).toBe(503);
      expect((error as ModuleDisabledError).module).toBe('franchise_os');
    }
  });

  it('assertModuleEnabled is silent when the gate is open', () => {
    expect(() =>
      assertModuleEnabled(
        FRANCHISE_OS_GATE,
        env({ PESKIDS_ENVIRONMENT: 'staging', PESKIDS_FRANCHISE_OS_ENABLED: 'true' })
      )
    ).not.toThrow();
  });
});
