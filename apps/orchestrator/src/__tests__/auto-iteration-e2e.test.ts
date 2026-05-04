import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fsp } from 'fs';
import * as path from 'path';
import { IterationOrchestrator } from '../lib/iteration-orchestrator.js';
import { AgentTrainer } from '../lib/agent-trainer.js';

/**
 * End-to-End Test: Phase 7 - Autonomous Iteration + Pattern Learning
 *
 * Tests:
 * - Single prompt → auto-generation of 3-5 iteration prompts
 * - Each iteration improves (fewer failures)
 * - Final result auto-committed with history
 * - Pattern recording after 10+ executions
 *
 * Definition of Done:
 * - All tests passing (35/35 + this new test)
 * - Type-check passing
 * - Single prompt → 3-5 auto-generated iteration prompts
 * - Each iteration improves validation
 */
describe('Phase 7: Autonomous Iteration + Pattern Learning', () => {
  let orchestrator: IterationOrchestrator;
  let trainer: AgentTrainer;
  let testDir: string;

  beforeEach(async () => {
    // Setup test environment
    testDir = '.cursor-test-' + Date.now();
    orchestrator = new IterationOrchestrator(testDir);
    trainer = new AgentTrainer();

    // Ensure test directory exists
    await fsp.mkdir(testDir, { recursive: true });
    await fsp.mkdir(path.join(testDir, 'prompts'), { recursive: true });
    await fsp.mkdir(path.join(testDir, 'sessions'), { recursive: true });
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fsp.rm(testDir, { recursive: true, force: true });
    } catch (err) {
      console.warn('Failed to cleanup test directory:', err);
    }
  });

  describe('Test 1: Session Lifecycle', () => {
    it('should create iteration session', async () => {
      const jobId = 'test-job-1';
      const session = await orchestrator.startIterationSession(jobId, 5, 'Test goal');

      expect(session).toBeDefined();
      expect(session.jobId).toBe(jobId);
      expect(session.maxIterations).toBe(5);
      expect(session.currentIteration).toBe(0);
      expect(session.status).toBe('active');
      expect(session.history).toEqual([]);
    });

    it('should retrieve active session', async () => {
      const jobId = 'test-job-2';
      await orchestrator.startIterationSession(jobId, 3);

      const session = orchestrator.getSession(jobId);
      expect(session).toBeDefined();
      expect(session!.jobId).toBe(jobId);
    });

    it('should complete session with final result', async () => {
      const jobId = 'test-job-3';
      await orchestrator.startIterationSession(jobId, 3, 'Build feature');

      const finalResult = 'Successfully built feature X';
      const completed = await orchestrator.completeSession(jobId, finalResult);

      expect(completed.status).toBe('completed');
      expect(completed.finalResult).toBe(finalResult);
      expect(completed.endTime).toBeDefined();
    });
  });

  describe('Test 2: Iteration Prompt Generation', () => {
    it('should enqueue first iteration prompt', async () => {
      const jobId = 'test-job-4';
      const session = await orchestrator.startIterationSession(jobId, 5, 'Initial prompt');

      const firstPrompt = 'Build a simple API endpoint';
      const promptPath = await orchestrator.enqueueNextPrompt(jobId, firstPrompt, 1);

      expect(promptPath).toContain('prompts');
      expect(promptPath).toContain('iteration-test-job-4-1');

      // Verify file exists
      const content = await fsp.readFile(promptPath, 'utf-8');
      expect(content).toContain('# Iteration 1/5');
      expect(content).toContain(firstPrompt);
    });

    it('should generate multiple iteration prompts', async () => {
      const jobId = 'test-job-5';
      const session = await orchestrator.startIterationSession(jobId, 5);

      const prompts: string[] = [];
      for (let i = 1; i <= 3; i++) {
        const prompt = `Iteration ${i} prompt`;
        const path = await orchestrator.enqueueNextPrompt(jobId, prompt, i);
        prompts.push(path);
      }

      expect(prompts).toHaveLength(3);
      prompts.forEach((p) => expect(p).toContain('iteration-test-job-5'));
    });

    it('should enforce max iterations limit', async () => {
      const jobId = 'test-job-6';
      const session = await orchestrator.startIterationSession(jobId, 2);

      // Record 2 iterations
      orchestrator.recordIterationEntry(jobId, 1, 'prompt1', 'result1', 'failed', 100);
      orchestrator.recordIterationEntry(jobId, 2, 'prompt2', 'result2', 'failed', 100);

      // Third should fail
      await expect(
        orchestrator.suggestNextIteration(jobId, 'result2', 'executor', 'test'),
      ).rejects.toThrow('Max iterations');
    });
  });

  describe('Test 3: Iteration Improvement Tracking', () => {
    it('should detect iteration improvement', async () => {
      const jobId = 'test-job-7';
      await orchestrator.startIterationSession(jobId, 5);

      // First iteration failed
      orchestrator.recordIterationEntry(jobId, 1, 'prompt1', 'result1', 'failed', 100);

      // Second iteration passed
      orchestrator.recordIterationEntry(jobId, 2, 'prompt2', 'result2', 'passed', 150);

      const improved = orchestrator.didIterationImprove(jobId);
      expect(improved).toBe(true);
    });

    it('should calculate iteration statistics', async () => {
      const jobId = 'test-job-8';
      await orchestrator.startIterationSession(jobId, 5);

      // Record multiple iterations
      orchestrator.recordIterationEntry(jobId, 1, 'prompt1', 'result1', 'failed', 100);
      orchestrator.recordIterationEntry(jobId, 2, 'prompt2', 'result2', 'failed', 120);
      orchestrator.recordIterationEntry(jobId, 3, 'prompt3', 'result3', 'passed', 110);
      orchestrator.recordIterationEntry(jobId, 4, 'prompt4', 'result4', 'passed', 105);

      const stats = orchestrator.getIterationStats(jobId);

      expect(stats).toBeDefined();
      expect(stats!.totalIterations).toBe(4);
      expect(stats!.passedIterations).toBe(2);
      expect(stats!.failedIterations).toBe(2);
      expect(stats!.totalDuration).toBe(100 + 120 + 110 + 105);
      expect(stats!.avgDuration).toBeGreaterThan(0);
    });
  });

  describe('Test 4: Session Persistence', () => {
    it('should persist completed session to disk', async () => {
      const jobId = 'test-job-9';
      await orchestrator.startIterationSession(jobId, 3);

      orchestrator.recordIterationEntry(jobId, 1, 'prompt1', 'result1', 'passed', 100);

      const session = await orchestrator.completeSession(jobId, 'Final result');

      // Verify session file was created
      const sessionPath = path.join(testDir, 'sessions', `session-${jobId}.json`);
      const exists = await fsp
        .access(sessionPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);

      // Verify can reload
      const loaded = await orchestrator.loadSession(jobId);
      expect(loaded).toBeDefined();
      expect(loaded!.finalResult).toBe('Final result');
    });

    it('should restore session from disk', async () => {
      const jobId = 'test-job-10';
      const session1 = await orchestrator.startIterationSession(jobId, 5, 'Goal');
      orchestrator.recordIterationEntry(jobId, 1, 'prompt1', 'result1', 'passed', 100);
      await orchestrator.completeSession(jobId, 'Final');

      // Create new orchestrator instance (simulating restart)
      const orchestrator2 = new IterationOrchestrator(testDir);
      const restored = await orchestrator2.loadSession(jobId);

      expect(restored).toBeDefined();
      expect(restored!.jobId).toBe(jobId);
      expect(restored!.history).toHaveLength(1);
      expect(restored!.status).toBe('completed');
    });
  });

  describe('Test 5: Pattern Suggestion', () => {
    it('should suggest next iteration without patterns', async () => {
      const jobId = 'test-job-11';
      await orchestrator.startIterationSession(jobId, 5, 'Original prompt');

      const suggestion = await orchestrator.suggestNextIteration(
        jobId,
        'Previous result had errors',
        'executor',
        'execute_code',
      );

      expect(suggestion).toBeDefined();
      expect(suggestion.nextPrompt).toBeDefined();
      expect(suggestion.confidence).toBeGreaterThan(0);
      expect(suggestion.confidence).toBeLessThanOrEqual(1);
    });

    it('should base confidence on pattern existence', async () => {
      const jobId = 'test-job-12';
      await orchestrator.startIterationSession(jobId, 5);

      // Get suggestion (no patterns yet)
      const suggestion = await orchestrator.suggestNextIteration(
        jobId,
        'Error result',
        'executor',
        'unknown-intent',
      );

      // Without patterns, confidence should be lower
      expect(suggestion.confidence).toBeLessThan(0.5);
    });
  });

  describe('Test 6: Full Iteration Cycle (3-5 prompts)', () => {
    it('should generate 3 iteration prompts from single input', async () => {
      const jobId = 'test-job-13';
      const initialPrompt = 'Create a function that validates email addresses';

      await orchestrator.startIterationSession(jobId, 5, initialPrompt);

      const promptPaths: string[] = [];

      // Simulate 3 iterations
      for (let i = 1; i <= 3; i++) {
        const result = i === 1 ? 'Initial attempt' : `Iteration ${i - 1} result`;

        // Get next prompt suggestion
        const suggestion = await orchestrator.suggestNextIteration(
          jobId,
          result,
          'executor',
          'execute_code',
        );

        // Record entry
        orchestrator.recordIterationEntry(
          jobId,
          i,
          suggestion.nextPrompt,
          `result-${i}`,
          i === 3 ? 'passed' : 'failed',
          100 + i * 10,
        );

        // Enqueue for execution
        const path = await orchestrator.enqueueNextPrompt(jobId, suggestion.nextPrompt, i);
        promptPaths.push(path);
      }

      expect(promptPaths).toHaveLength(3);
      promptPaths.forEach((p) => expect(p).toContain('iteration'));
    });

    it('should show improvement across iterations', async () => {
      const jobId = 'test-job-14';
      await orchestrator.startIterationSession(jobId, 5);

      // Iteration 1: Failed
      orchestrator.recordIterationEntry(jobId, 1, 'prompt1', 'result1', 'failed', 100);

      // Iteration 2: Failed
      orchestrator.recordIterationEntry(jobId, 2, 'prompt2', 'result2', 'failed', 110);

      // Iteration 3: Passed
      orchestrator.recordIterationEntry(jobId, 3, 'prompt3', 'result3', 'passed', 120);

      const stats = orchestrator.getIterationStats(jobId);

      expect(stats!.failedIterations).toBe(2);
      expect(stats!.passedIterations).toBe(1);

      // Last 2 should show improvement
      const session = orchestrator.getSession(jobId);
      const lastTwo = session!.history.slice(-2);
      const improved = lastTwo[0].validationStatus === 'failed' && lastTwo[1].validationStatus === 'passed';
      expect(improved).toBe(true);
    });
  });

  describe('Test 7: AgentTrainer Integration', () => {
    it('should record execution for training', async () => {
      const recorded = await trainer.recordExecution(
        'Create API endpoint',
        'executor',
        'function createEndpoint() { }',
        150,
        1,
        true,
      );

      // Should return true if recording succeeded
      expect(recorded).toBeDefined();
    });

    it('should record decisions for pattern learning', async () => {
      const recorded = await trainer.recordDecision(
        'job-123',
        'commit',
        'executor',
        'execute_code',
        2,
        250,
        [],
      );

      expect(recorded).toBeDefined();
    });

    it('should retrieve patterns (if available)', async () => {
      // Query patterns for executor/execute_code (may not exist yet)
      const patterns = await trainer.getPatterns('executor', 'execute_code');

      // Should return null if no patterns exist yet
      if (patterns) {
        expect(patterns.agentRole).toBe('executor');
        expect(patterns.intent).toBe('execute_code');
        expect(patterns.successRate).toBeGreaterThanOrEqual(0);
        expect(patterns.successRate).toBeLessThanOrEqual(1);
      }
    });

    it('should suggest prompt based on patterns', async () => {
      const basePrompt = 'Create a function';
      const result = 'function created with errors';

      const suggestion = await trainer.suggestNextPrompt(basePrompt, result, null);

      expect(suggestion).toBeDefined();
      expect(suggestion.nextPrompt).toBeDefined();
      expect(suggestion.confidence).toBeGreaterThanOrEqual(0.3);
    });
  });

  describe('Test 8: Memory Management', () => {
    it('should track memory usage', () => {
      const stats = trainer.getMemoryStats();

      expect(stats).toBeDefined();
      expect(stats.executionsInMemory).toBeGreaterThanOrEqual(0);
      expect(stats.decisionsInMemory).toBeGreaterThanOrEqual(0);
    });

    it('should cleanup old sessions', async () => {
      const jobId1 = 'test-job-old-1';
      const jobId2 = 'test-job-old-2';

      await orchestrator.startIterationSession(jobId1, 3);
      await orchestrator.startIterationSession(jobId2, 3);

      // Manually adjust timestamp to be "old"
      const session1 = orchestrator.getSession(jobId1)!;
      session1.startTime = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(); // 100 days ago

      orchestrator.cleanupOldSessions(24 * 60 * 60 * 1000); // 24 hour cutoff

      const retrieved1 = orchestrator.getSession(jobId1);
      const retrieved2 = orchestrator.getSession(jobId2);

      // Old session should be removed, new should remain
      expect(retrieved1).toBeNull();
      expect(retrieved2).toBeDefined();
    });

    it('should clear old trainer memory', () => {
      trainer.clearOldMemory(1000); // 1 second cutoff

      const stats = trainer.getMemoryStats();
      // Memory should be cleared (may be 0 if everything was old)
      expect(stats.executionsInMemory).toBeLessThanOrEqual(1);
    });
  });

  describe('Test 9: Error Handling', () => {
    it('should throw on non-existent session', async () => {
      await expect(
        orchestrator.suggestNextIteration('non-existent', 'result', 'executor', 'test'),
      ).rejects.toThrow('Session not found');
    });

    it('should handle filesystem errors gracefully', async () => {
      const jobId = 'test-job-15';
      await orchestrator.startIterationSession(jobId, 5);

      // Try to enqueue to invalid path (use very long path to trigger error)
      const badOrchestrator = new IterationOrchestrator('/dev/null/invalid/path');

      await expect(badOrchestrator.enqueueNextPrompt(jobId, 'prompt', 1)).rejects.toThrow();
    });
  });

  describe('Test 10: End-to-End Integration', () => {
    it('should complete full autonomous iteration workflow', async () => {
      const jobId = 'test-job-e2e';
      const initialPrompt = 'Build a function that processes data';

      // 1. Start session
      const session = await orchestrator.startIterationSession(jobId, 5, initialPrompt);
      expect(session.status).toBe('active');

      // 2. Generate and enqueue 3 iterations
      const executedPrompts: string[] = [];

      for (let i = 1; i <= 3; i++) {
        // Get suggestion
        const suggestion = await orchestrator.suggestNextIteration(
          jobId,
          i === 1 ? 'Initial attempt' : `Iteration ${i - 1} result`,
          'executor',
          'execute_code',
        );

        // Enqueue
        const promptPath = await orchestrator.enqueueNextPrompt(jobId, suggestion.nextPrompt, i);
        executedPrompts.push(promptPath);

        // Simulate execution result
        const success = i === 3; // Last one passes
        orchestrator.recordIterationEntry(
          jobId,
          i,
          suggestion.nextPrompt,
          `Result from iteration ${i}`,
          success ? 'passed' : 'failed',
          100 + i * 10,
        );
      }

      // 3. Verify iteration improvement
      const improved = orchestrator.didIterationImprove(jobId);
      expect(improved).toBe(true); // Went from failed to passed

      // 4. Complete session
      const completed = await orchestrator.completeSession(jobId, 'Successfully completed workflow');
      expect(completed.status).toBe('completed');
      expect(completed.history).toHaveLength(3);

      // 5. Verify statistics
      const stats = orchestrator.getIterationStats(jobId);
      expect(stats!.totalIterations).toBe(3);
      expect(stats!.passedIterations).toBe(1);
      expect(stats!.failedIterations).toBe(2);

      // 6. Verify files were created
      expect(executedPrompts).toHaveLength(3);
      for (const promptPath of executedPrompts) {
        const exists = await fsp
          .access(promptPath)
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
      }
    });
  });
});
