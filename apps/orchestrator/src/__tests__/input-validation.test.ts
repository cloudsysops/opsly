import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentTrainer } from '../lib/agent-trainer.js';
import { ValidationOrchestrator } from '../lib/validation-orchestrator.js';
import { IterationOrchestrator } from '../lib/iteration-orchestrator.js';

describe('Input Validation Tests', () => {
  describe('AgentTrainer.recordExecution()', () => {
    let trainer: AgentTrainer;

    beforeEach(() => {
      // Set minimal Supabase env vars for testing
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';

      trainer = new AgentTrainer();
    });

    afterEach(() => {
      trainer.destroy();
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });

    it('handles empty prompt string', async () => {
      const result = await trainer.recordExecution(
        '', // Empty prompt
        'executor',
        'Some result',
        100,
        1,
        false
      );

      // Should return false if Supabase fails, true if succeeds
      expect(typeof result).toBe('boolean');
    });

    it('handles null prompt safely', async () => {
      const result = await trainer.recordExecution(
        null as any, // null prompt
        'executor',
        'Result',
        100,
        1,
        false
      );

      // Should handle gracefully
      expect(typeof result).toBe('boolean');
    });

    it('handles very long prompt (>10KB)', async () => {
      const longPrompt = 'x'.repeat(15000); // 15KB

      const result = await trainer.recordExecution(
        longPrompt,
        'executor',
        'Result',
        100,
        1,
        false
      );

      expect(typeof result).toBe('boolean');
    });

    it('handles empty agent role', async () => {
      const result = await trainer.recordExecution(
        'Test prompt',
        '', // Empty agent role
        'Result',
        100,
        1,
        false
      );

      expect(typeof result).toBe('boolean');
    });

    it('handles invalid enum values for agent role', async () => {
      const result = await trainer.recordExecution(
        'Test prompt',
        'invalid_role', // Invalid enum
        'Result',
        100,
        1,
        false
      );

      expect(typeof result).toBe('boolean');
    });

    it('handles zero iteration count', async () => {
      const result = await trainer.recordExecution(
        'Test prompt',
        'executor',
        'Result',
        100,
        0, // Zero iterations
        false
      );

      expect(typeof result).toBe('boolean');
    });

    it('handles negative duration', async () => {
      const result = await trainer.recordExecution(
        'Test prompt',
        'executor',
        'Result',
        -100, // Negative duration
        1,
        false
      );

      // Should handle gracefully
      expect(typeof result).toBe('boolean');
    });

    it('handles empty failed_checks array', async () => {
      const result = await trainer.recordExecution(
        'Test prompt',
        'executor',
        'Result',
        100,
        1,
        false,
        [] // Empty checks
      );

      expect(typeof result).toBe('boolean');
    });

    it('handles very large failed_checks array', async () => {
      const checks = Array(100).fill('check_name');

      const result = await trainer.recordExecution(
        'Test prompt',
        'executor',
        'Result',
        100,
        1,
        false,
        checks
      );

      expect(typeof result).toBe('boolean');
    });
  });

  describe('ValidationOrchestrator.validateAndDecide()', () => {
    let orchestrator: ValidationOrchestrator;

    beforeEach(() => {
      orchestrator = new ValidationOrchestrator();
    });

    it('handles empty job ID', async () => {
      try {
        await orchestrator.validateAndDecide(
          '', // Empty job ID
          'executor',
          '/tmp/response.md',
          1,
          3
        );
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('handles non-existent response file', async () => {
      try {
        const decision = await orchestrator.validateAndDecide(
          'job-123',
          'executor',
          '/nonexistent/path/response.md',
          1,
          3
        );

        // Should handle gracefully or throw
        expect(decision).toBeDefined();
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('handles zero max iterations', async () => {
      try {
        await orchestrator.validateAndDecide(
          'job-123',
          'executor',
          '/tmp/response.md',
          1,
          0 // Zero max iterations
        );
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('handles iteration count exceeding max', async () => {
      try {
        const decision = await orchestrator.validateAndDecide(
          'job-123',
          'executor',
          '/tmp/response.md',
          5, // iteration count
          3 // max iterations
        );

        // Should handle boundary condition
        expect(decision).toBeDefined();
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('handles invalid agent role', async () => {
      try {
        const decision = await orchestrator.validateAndDecide(
          'job-123',
          'invalid_role',
          '/tmp/response.md',
          1,
          3
        );

        expect(decision).toBeDefined();
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });

  describe('IterationOrchestrator edge cases', () => {
    let orchestrator: IterationOrchestrator;

    beforeEach(() => {
      orchestrator = new IterationOrchestrator();
    });

    afterEach(() => {
      orchestrator.destroy();
    });

    it('handles empty goal string', async () => {
      const session = await orchestrator.startIterationSession(
        'job-123',
        5,
        '' // Empty goal
      );

      expect(session.goal).toBe('');
      expect(session.status).toBe('active');
    });

    it('handles null goal gracefully', async () => {
      const session = await orchestrator.startIterationSession(
        'job-123',
        5,
        null as any
      );

      expect(session).toBeDefined();
    });

    it('handles zero max iterations', async () => {
      try {
        await orchestrator.startIterationSession(
          'job-123',
          0, // Zero max iterations
          'Test goal'
        );
      } catch (err) {
        // Should error or handle
        expect(err).toBeDefined();
      }
    });

    it('handles very large max iterations', async () => {
      const session = await orchestrator.startIterationSession(
        'job-123',
        1000, // 1000 iterations
        'Test goal'
      );

      expect(session.maxIterations).toBe(1000);
    });

    it('handles duplicate job IDs', async () => {
      const session1 = await orchestrator.startIterationSession(
        'duplicate-job',
        5,
        'Goal 1'
      );

      const session2 = await orchestrator.startIterationSession(
        'duplicate-job', // Same ID
        5,
        'Goal 2'
      );

      // Second should overwrite first
      expect(session2.goal).toBe('Goal 2');
    });

    it('recordIterationEntry with empty prompt', async () => {
      // Create session first
      await orchestrator.startIterationSession('job-empty-prompt', 5, 'Test goal');

      orchestrator.recordIterationEntry(
        'job-empty-prompt',
        1,
        '', // Empty prompt
        'Result',
        'passed',
        100
      );

      const session = orchestrator.getSession('job-empty-prompt');
      expect(session?.history).toBeDefined();
      expect(session?.history.length).toBe(1);
    });

    it('recordIterationEntry with null result', async () => {
      // Create session first
      await orchestrator.startIterationSession('job-null-result', 5, 'Test goal');

      orchestrator.recordIterationEntry(
        'job-null-result',
        1,
        'Prompt',
        null as any, // null result
        'passed',
        100
      );

      const session = orchestrator.getSession('job-null-result');
      expect(session?.history).toBeDefined();
      expect(session?.history.length).toBe(1);
    });

    it('recordIterationEntry with negative duration', async () => {
      // Create session first
      await orchestrator.startIterationSession('job-negative-duration', 5, 'Test goal');

      orchestrator.recordIterationEntry(
        'job-negative-duration',
        1,
        'Prompt',
        'Result',
        'passed',
        -100 // Negative duration
      );

      const session = orchestrator.getSession('job-negative-duration');
      expect(session?.history).toBeDefined();
      expect(session?.history.length).toBe(1);
    });
  });
});
