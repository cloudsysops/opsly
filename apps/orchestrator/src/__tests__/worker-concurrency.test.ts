import { afterEach, describe, expect, it } from 'vitest';
import { getWorkerConcurrency, getWorkerConcurrencyEnvName } from '../worker-concurrency.js';

describe('getWorkerConcurrency', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('keeps historical defaults in full mode', () => {
    delete process.env.OPSLY_ORCHESTRATOR_ROLE;
    delete process.env.OPSLY_ORCHESTRATOR_MODE;
    expect(getWorkerConcurrency('cursor')).toBe(3);
    expect(getWorkerConcurrency('ollama')).toBe(2);
    expect(getWorkerConcurrency('webhook')).toBe(10);
  });

  it('uses conservative defaults in worker-enabled mode', () => {
    delete process.env.OPSLY_ORCHESTRATOR_ROLE;
    process.env.OPSLY_ORCHESTRATOR_MODE = 'worker-enabled';
    expect(getWorkerConcurrency('cursor')).toBe(1);
    expect(getWorkerConcurrency('n8n')).toBe(1);
    expect(getWorkerConcurrency('notify')).toBe(2);
    expect(getWorkerConcurrency('ollama')).toBe(1);
  });

  it('accepts explicit env overrides', () => {
    delete process.env.OPSLY_ORCHESTRATOR_ROLE;
    process.env.OPSLY_ORCHESTRATOR_MODE = 'worker-enabled';
    process.env.ORCHESTRATOR_CURSOR_CONCURRENCY = '4';
    expect(getWorkerConcurrency('cursor')).toBe(4);
  });

  it('ignores invalid env overrides', () => {
    delete process.env.OPSLY_ORCHESTRATOR_ROLE;
    process.env.OPSLY_ORCHESTRATOR_MODE = 'worker-enabled';
    process.env.ORCHESTRATOR_OLLAMA_CONCURRENCY = '0';
    expect(getWorkerConcurrency('ollama')).toBe(1);
  });

  it('exposes the env name for documentation', () => {
    expect(getWorkerConcurrencyEnvName('drive')).toBe('ORCHESTRATOR_DRIVE_CONCURRENCY');
  });
});
