import { afterEach, describe, expect, it } from 'vitest';
import {
  orchestratorModeLabel,
  parseOrchestratorRole,
  shouldRunControlPlane,
  shouldRunWorkers,
} from '../orchestrator-role.js';

describe('parseOrchestratorRole', () => {
  const original = process.env;

  afterEach(() => {
    process.env = { ...original };
  });

  it('defaults to full when unset', () => {
    delete process.env.OPSLY_ORCHESTRATOR_ROLE;
    delete process.env.OPSLY_ORCHESTRATOR_MODE;
    expect(parseOrchestratorRole()).toBe('full');
  });

  it('maps control synonyms', () => {
    for (const v of ['control', 'CONTROL', 'dispatch', 'dispatch-only']) {
      process.env.OPSLY_ORCHESTRATOR_ROLE = v;
      expect(parseOrchestratorRole()).toBe('control');
    }
  });

  it('maps worker synonyms', () => {
    for (const v of ['worker', 'workers']) {
      process.env.OPSLY_ORCHESTRATOR_ROLE = v;
      expect(parseOrchestratorRole()).toBe('worker');
    }
  });

  it('ROLE takes precedence over OPSLY_ORCHESTRATOR_MODE', () => {
    process.env.OPSLY_ORCHESTRATOR_ROLE = 'worker';
    process.env.OPSLY_ORCHESTRATOR_MODE = 'queue-only';
    expect(parseOrchestratorRole()).toBe('worker');
  });

  it('maps OPSLY_ORCHESTRATOR_MODE when ROLE unset', () => {
    delete process.env.OPSLY_ORCHESTRATOR_ROLE;
    process.env.OPSLY_ORCHESTRATOR_MODE = 'queue-only';
    expect(parseOrchestratorRole()).toBe('control');
    delete process.env.OPSLY_ORCHESTRATOR_MODE;
    process.env.OPSLY_ORCHESTRATOR_MODE = 'worker-enabled';
    expect(parseOrchestratorRole()).toBe('worker');
  });
});

describe('orchestratorModeLabel', () => {
  it('maps roles to display modes', () => {
    expect(orchestratorModeLabel('control')).toBe('queue-only');
    expect(orchestratorModeLabel('worker')).toBe('worker-enabled');
    expect(orchestratorModeLabel('full')).toBe('full-stack');
  });
});

describe('shouldRunControlPlane / shouldRunWorkers', () => {
  it('full runs both', () => {
    expect(shouldRunControlPlane('full')).toBe(true);
    expect(shouldRunWorkers('full')).toBe(true);
  });

  it('control runs only control plane', () => {
    expect(shouldRunControlPlane('control')).toBe(true);
    expect(shouldRunWorkers('control')).toBe(false);
  });

  it('worker runs only workers', () => {
    expect(shouldRunControlPlane('worker')).toBe(false);
    expect(shouldRunWorkers('worker')).toBe(true);
  });
});
