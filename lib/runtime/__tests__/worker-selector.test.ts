/**
 * Tests for Worker Selector
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { selectWorker, getWorkerConfig } from '../worker-selector';
import { EnvironmentCapabilities } from '../environment-detector';

describe('worker-selector', () => {
  describe('getWorkerConfig', () => {
    it('should return array of worker configs', () => {
      const env: EnvironmentCapabilities = {
        os: 'macos',
        osVersion: '26.3.1',
        arch: 'x64',
        hostname: 'test',
        agents: {
          cursor: { name: 'cursor', installed: true },
          claude: { name: 'claude', installed: false },
          codex: { name: 'codex', installed: false },
          opencode: { name: 'opencode', installed: false },
        },
        ollama: { installed: true, running: true, models: ['llama3.2'], url: 'http://localhost:11434' },
        tools: { hasNode: true } as any,
        resources: { cpuCores: 8, memoryGB: 16 } as any,
        recommendedAgent: 'cursor',
        confidence: 1,
        timestamp: new Date().toISOString(),
      };

      const workers = getWorkerConfig(env);

      expect(Array.isArray(workers)).toBe(true);
      expect(workers.length).toBeGreaterThan(0);
    });

    it('should include local worker when cursor installed', () => {
      const env: EnvironmentCapabilities = {
        os: 'macos',
        osVersion: '26.3.1',
        arch: 'x64',
        hostname: 'test',
        agents: {
          cursor: { name: 'cursor', installed: true },
          claude: { name: 'claude', installed: false },
          codex: { name: 'codex', installed: false },
          opencode: { name: 'opencode', installed: false },
        },
        ollama: { installed: false, running: false, models: [] },
        tools: { hasNode: true } as any,
        resources: { cpuCores: 8, memoryGB: 16 } as any,
        recommendedAgent: 'cursor',
        confidence: 1,
        timestamp: new Date().toISOString(),
      };

      const workers = getWorkerConfig(env);
      const localWorker = workers.find(w => w.type === 'local');

      expect(localWorker).toBeDefined();
      expect(localWorker?.priority).toBe(10);
    });

    it('should include ollama when running', () => {
      const env: EnvironmentCapabilities = {
        os: 'macos',
        osVersion: '26.3.1',
        arch: 'x64',
        hostname: 'test',
        agents: { cursor: { name: 'cursor', installed: false } } as any,
        ollama: { installed: true, running: true, models: ['llama3.2'], url: 'http://localhost:11434' },
        tools: { hasNode: true } as any,
        resources: { cpuCores: 8, memoryGB: 16 } as any,
        recommendedAgent: 'ollama',
        confidence: 1,
        timestamp: new Date().toISOString(),
      };

      const workers = getWorkerConfig(env);
      const ollamaWorker = workers.find(w => w.type === 'ollama');

      expect(ollamaWorker).toBeDefined();
      expect(ollamaWorker?.costPerToken).toBe(0);
    });
  });

  describe('selectWorker', () => {
    it('should select worker for low budget', async () => {
      const result = await selectWorker({ budget: 'low' });

      expect(result).toHaveProperty('worker');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('fallbackWorkers');
    });

    it('should select worker for high budget', async () => {
      const result = await selectWorker({ budget: 'high' });

      expect(result.worker).toBeDefined();
      expect(result.reason).toBeTruthy();
    });

    it('should include fallback workers', async () => {
      const result = await selectWorker({ budget: 'medium' });

      expect(Array.isArray(result.fallbackWorkers)).toBe(true);
    });

    it('should accept criteria with preferred worker', async () => {
      const result = await selectWorker({
        budget: 'medium',
        preferredWorker: 'ollama',
      });

      expect(result).toBeDefined();
    });
  });
});