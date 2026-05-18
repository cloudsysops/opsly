/**
 * Tests for Local Executor
 */
import { describe, it, expect } from 'vitest';
import { executeLocalAgent } from '../local-executor';

describe('local-executor', () => {
  describe('executeLocalAgent', () => {
    it('should return result with required fields for unknown agent', async () => {
      const result = await executeLocalAgent({
        prompt: 'test',
        agent: 'invalid-agent' as any,
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('agent');
      expect(result).toHaveProperty('duration');
      expect(result.success).toBe(false);
    });

    it('should handle ollama agent request', async () => {
      const result = await executeLocalAgent({
        prompt: 'test',
        agent: 'ollama',
        timeout: 2000,
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('agent');
      expect(result).toHaveProperty('duration');
    });

    it('should handle cursor agent request', async () => {
      const result = await executeLocalAgent({
        prompt: 'test',
        agent: 'cursor',
        timeout: 2000,
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('agent');
    });
  });
});