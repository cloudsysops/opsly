/**
 * Tests for Environment Detector
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectEnvironment,
  healthCheck,
  detectOS,
  selectRecommendedAgent,
  calculateConfidence,
} from '../environment-detector';

describe('environment-detector', () => {
  describe('detectOS', () => {
    it('should detect macOS on darwin platform', () => {
      const result = detectOS();
      expect(['macos', 'linux', 'windows', 'unknown']).toContain(result.os);
    });

    it('should return arch', () => {
      const result = detectOS();
      expect(result.arch).toBeDefined();
    });
  });

  describe('selectRecommendedAgent', () => {
    it('should prefer cursor when installed', () => {
      const agents = {
        cursor: { name: 'cursor', installed: true, path: '/test' },
        claude: { name: 'claude', installed: false },
        codex: { name: 'codex', installed: false },
        opencode: { name: 'opencode', installed: false },
      };
      const ollama = { installed: false, running: false, models: [] };
      const resources = { cpuCores: 8, memoryGB: 16 };

      const result = selectRecommendedAgent(agents as any, ollama, resources);
      expect(result).toBe('cursor');
    });

    it('should fallback to ollama when no agents but ollama running', () => {
      const agents = {
        cursor: { name: 'cursor', installed: false },
        claude: { name: 'claude', installed: false },
        codex: { name: 'codex', installed: false },
        opencode: { name: 'opencode', installed: false },
      };
      const ollama = { installed: true, running: true, models: ['llama3.2'] };
      const resources = { cpuCores: 4, memoryGB: 8 };

      const result = selectRecommendedAgent(agents as any, ollama, resources);
      expect(result).toBe('ollama');
    });

    it('should prefer remote when nothing available', () => {
      const agents = {
        cursor: { name: 'cursor', installed: false },
        claude: { name: 'claude', installed: false },
        codex: { name: 'codex', installed: false },
        opencode: { name: 'opencode', installed: false },
      };
      const ollama = { installed: false, running: false, models: [] };
      const resources = { cpuCores: 2, memoryGB: 4 };

      const result = selectRecommendedAgent(agents as any, ollama, resources);
      expect(result).toBe('remote');
    });
  });

  describe('calculateConfidence', () => {
    it('should return 1.0 when everything is available', () => {
      const agents = {
        cursor: { name: 'cursor', installed: true },
        claude: { name: 'claude', installed: true },
        codex: { name: 'codex', installed: true },
        opencode: { name: 'opencode', installed: true },
      };
      const ollama = { installed: true, running: true, models: ['llama3.2'] };
      const tools = { hasNode: true, hasDocker: true, hasPython: true } as any;
      const resources = { cpuCores: 8, memoryGB: 16, diskGB: 500, diskFreeGB: 200 };

      const result = calculateConfidence(agents as any, ollama, tools, resources);
      expect(result).toBe(1);
    });

    it('should return lower score when few things available', () => {
      const agents = {
        cursor: { name: 'cursor', installed: false },
        claude: { name: 'claude', installed: false },
        codex: { name: 'codex', installed: false },
        opencode: { name: 'opencode', installed: false },
      };
      const ollama = { installed: false, running: false, models: [] };
      const tools = { hasNode: false, hasDocker: false, hasPython: false } as any;
      const resources = { cpuCores: 0, memoryGB: 0, diskGB: 0, diskFreeGB: 0 };

      const result = calculateConfidence(agents as any, ollama, tools, resources);
      expect(result).toBeLessThan(1);
    });
  });

  describe('detectEnvironment', () => {
    it('should return complete environment object', async () => {
      const env = await detectEnvironment();

      expect(env).toHaveProperty('os');
      expect(env).toHaveProperty('agents');
      expect(env).toHaveProperty('ollama');
      expect(env).toHaveProperty('tools');
      expect(env).toHaveProperty('resources');
      expect(env).toHaveProperty('recommendedAgent');
      expect(env).toHaveProperty('confidence');
      expect(env).toHaveProperty('timestamp');
    });

    it('should have reasonable confidence value', async () => {
      const env = await detectEnvironment();
      expect(env.confidence).toBeGreaterThanOrEqual(0);
      expect(env.confidence).toBeLessThanOrEqual(1);
    });

    it('should have valid recommended agent', async () => {
      const env = await detectEnvironment();
      const validAgents = ['cursor', 'claude', 'codex', 'opencode', 'ollama', 'remote'];
      expect(validAgents).toContain(env.recommendedAgent);
    });
  });

  describe('healthCheck', () => {
    it('should return health status object', async () => {
      const health = await healthCheck();

      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('cpuOk');
      expect(health).toHaveProperty('memoryOk');
      expect(health).toHaveProperty('diskOk');
      expect(health).toHaveProperty('ollamaOk');
      expect(health).toHaveProperty('agentsAvailable');
      expect(health).toHaveProperty('warnings');
      expect(health).toHaveProperty('errors');
    });

    it('should have array of agents', async () => {
      const health = await healthCheck();
      expect(Array.isArray(health.agentsAvailable)).toBe(true);
    });
  });
});
