import { describe, it, expect } from 'vitest';
import {
  createTaskSchema,
  registerWorkerSchema,
  taskLogSchema,
} from '../validation/schemas';

describe('Validation Schemas', () => {
  describe('createTaskSchema', () => {
    it('should validate a valid task creation request', () => {
      const input = {
        type: 'implementation',
        title: 'Add Guardian Shield feature',
        description: 'Implement Shield autonomous bot',
        prompt: 'Create Guardian Shield bot infrastructure',
        priority: 'high',
        created_by: 'claude',
        estimated_days: 3,
      };

      const result = createTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject task without required fields', () => {
      const input = {
        type: 'implementation',
        title: 'Test task',
        // missing prompt
      };

      const result = createTaskSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should set default priority to medium', () => {
      const input = {
        type: 'bugfix',
        title: 'Fix bug',
        prompt: 'Fix the bug',
      };

      const result = createTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe('medium');
      }
    });

    it('should reject invalid task type', () => {
      const input = {
        type: 'invalid-type',
        title: 'Test',
        prompt: 'Test prompt',
      };

      const result = createTaskSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('registerWorkerSchema', () => {
    it('should validate a valid worker registration', () => {
      const input = {
        id: 'cursor-macbook-prod',
        type: 'cursor',
        capacity: 2,
      };

      const result = registerWorkerSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject worker without ID', () => {
      const input = {
        type: 'cursor',
      };

      const result = registerWorkerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should set default capacity to 1', () => {
      const input = {
        id: 'worker-1',
        type: 'ci-runner',
      };

      const result = registerWorkerSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.capacity).toBe(1);
      }
    });
  });

  describe('taskLogSchema', () => {
    it('should validate a valid log entry', () => {
      const input = {
        level: 'info',
        message: 'Task started',
        context: { duration: 100 },
      };

      const result = taskLogSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should set default log level to info', () => {
      const input = {
        message: 'Task update',
      };

      const result = taskLogSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.level).toBe('info');
      }
    });

    it('should reject log without message', () => {
      const input = {
        level: 'error',
      };

      const result = taskLogSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
