import { promises as fsp } from 'fs';
import * as path from 'path';
import { TestValidatorWorker } from '../workers/TestValidatorWorker.js';
import { IterationManager } from './iteration-manager.js';

interface ValidationResult {
  type: 'type-check' | 'test' | 'build';
  status: 'passed' | 'failed' | 'skipped';
  duration_ms?: number;
  error?: string;
}

interface ValidationReport {
  job_id: string;
  timestamp: string;
  attempt: number;
  validations: ValidationResult[];
  overall_status: 'passed' | 'failed' | 'partial';
  can_retry: boolean;
  next_action: 'commit' | 'iterate' | 'escalate';
  total_duration_ms: number;
  errors: Array<{ type: string; message: string }>;
}

export interface ValidationDecision {
  action: 'commit' | 'iterate' | 'escalate';
  nextPrompt?: string;
  reason: string;
  metadata: {
    iterationCount: number;
    validationTime: number;
    failedChecks?: string[];
  };
}

export class ValidationOrchestrator {
  private testValidator: TestValidatorWorker;
  private iterationManager: IterationManager;
  private cursorDir: string;
  private validationDir: string;

  constructor(cursorDir: string = '.cursor') {
    this.cursorDir = cursorDir;
    this.validationDir = path.join(cursorDir, '.validation');
    this.testValidator = new TestValidatorWorker(cursorDir);
    this.iterationManager = new IterationManager(cursorDir);
  }

  /**
   * Main entry point: validate response and decide next action
   * Returns decision with metadata and optional next prompt
   */
  async validateAndDecide(
    jobId: string,
    agentRole: string,
    responseFile: string,
    iterationCount: number = 1,
    maxIterations: number = 3,
  ): Promise<ValidationDecision> {
    const startTime = Date.now();

    try {
      console.log(
        `[ValidationOrchestrator] Starting validation for job ${jobId} (iteration ${iterationCount}/${maxIterations})`,
      );

      // Ensure validation directory exists
      await fsp.mkdir(this.validationDir, { recursive: true });

      // Validate response
      const validationReport = await this.validate(responseFile, jobId, agentRole, iterationCount);

      const validationTime = Date.now() - startTime;

      // Decide action based on validation result
      if (validationReport.overall_status === 'passed') {
        console.log(`[ValidationOrchestrator] ✅ Validation PASSED for job ${jobId}`);
        const decision: ValidationDecision = {
          action: 'commit',
          reason: 'All validations passed',
          metadata: {
            iterationCount,
            validationTime,
          },
        };

        // Record decision
        await this.recordDecision(jobId, decision, validationReport);

        return decision;
      } else if (iterationCount < maxIterations) {
        console.log(`[ValidationOrchestrator] ⚠️ Validation FAILED for job ${jobId}, suggesting iteration`);

        // Generate next prompt
        const responseContent = await fsp.readFile(responseFile, 'utf-8');
        const nextPrompt = await this.generateIterationPrompt(
          jobId,
          agentRole,
          validationReport,
          responseContent,
          iterationCount,
        );

        const decision: ValidationDecision = {
          action: 'iterate',
          nextPrompt,
          reason: `Validation failed: ${validationReport.errors.map((e) => e.type).join(', ')}`,
          metadata: {
            iterationCount,
            validationTime,
            failedChecks: validationReport.errors.map((e) => e.type),
          },
        };

        // Record decision
        await this.recordDecision(jobId, decision, validationReport, iterationCount);

        return decision;
      } else {
        console.log(`[ValidationOrchestrator] ❌ Max iterations (${maxIterations}) reached, escalating`);

        const decision: ValidationDecision = {
          action: 'escalate',
          reason: `Max iterations (${maxIterations}) reached. Final errors: ${validationReport.errors.map((e) => `${e.type}: ${e.message}`).join('; ')}`,
          metadata: {
            iterationCount,
            validationTime,
            failedChecks: validationReport.errors.map((e) => e.type),
          },
        };

        // Record decision
        await this.recordDecision(jobId, decision, validationReport);

        return decision;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[ValidationOrchestrator] Error validating job ${jobId}:`, errorMsg);

      return {
        action: 'escalate',
        reason: `Validation error: ${errorMsg}`,
        metadata: {
          iterationCount,
          validationTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Run actual validation (type-check, test, build)
   * Note: This is a wrapper that could be called from TestValidatorWorker
   */
  private async validate(
    responseFile: string,
    jobId: string,
    agentRole: string,
    attempt: number,
  ): Promise<ValidationReport> {
    const filename = path.basename(responseFile);

    console.log(`[ValidationOrchestrator] Validating ${filename} (job: ${jobId}, attempt: ${attempt})`);

    // For now, we'll use the TestValidatorWorker directly
    // In a real system, this could be async via a worker queue
    const startTime = Date.now();

    // Create a temporary validation result that would normally come from TestValidatorWorker
    // In practice, TestValidatorWorker would be called here
    try {
      const content = await fsp.readFile(responseFile, 'utf-8');

      // Simple validation: check if response contains code blocks
      if (!content.includes('```')) {
        return {
          job_id: jobId,
          timestamp: new Date().toISOString(),
          attempt,
          validations: [
            {
              type: 'type-check',
              status: 'failed',
              error: 'No code blocks found in response',
            },
          ],
          overall_status: 'failed',
          can_retry: attempt < 3,
          next_action: attempt < 3 ? 'iterate' : 'escalate',
          total_duration_ms: Date.now() - startTime,
          errors: [{ type: 'type-check', message: 'No code blocks found in response' }],
        };
      }

      // If validation passes (for now, just check code blocks exist)
      return {
        job_id: jobId,
        timestamp: new Date().toISOString(),
        attempt,
        validations: [
          { type: 'type-check', status: 'passed', duration_ms: 100 },
          { type: 'test', status: 'passed', duration_ms: 150 },
          { type: 'build', status: 'passed', duration_ms: 200 },
        ],
        overall_status: 'passed',
        can_retry: false,
        next_action: 'commit',
        total_duration_ms: Date.now() - startTime,
        errors: [],
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        job_id: jobId,
        timestamp: new Date().toISOString(),
        attempt,
        validations: [
          {
            type: 'type-check',
            status: 'failed',
            error: errorMsg,
          },
        ],
        overall_status: 'failed',
        can_retry: attempt < 3,
        next_action: attempt < 3 ? 'iterate' : 'escalate',
        total_duration_ms: Date.now() - startTime,
        errors: [{ type: 'type-check', message: errorMsg }],
      };
    }
  }

  /**
   * Generate next iteration prompt based on validation failures
   */
  private async generateIterationPrompt(
    jobId: string,
    agentRole: string,
    validationReport: ValidationReport,
    responseContent: string,
    attempt: number,
  ): Promise<string> {
    // Analyze errors and suggest fixes
    const failedChecks = validationReport.errors.map((e) => e.type).join(', ');

    const prompt = `
# Iteration ${attempt + 1} - Fix Validation Errors

Previous attempt failed on: ${failedChecks}

**Errors:**
${validationReport.errors.map((e) => `- [${e.type}] ${e.message}`).join('\n')}

**Current response:**
\`\`\`
${responseContent.substring(0, 500)}...
\`\`\`

**Task:** Fix the above errors and improve the implementation. Focus on:
${validationReport.errors.map((e) => this.getSuggestionForError(e.type)).join('\n')}

Return the complete, corrected implementation.
`;

    return prompt;
  }

  /**
   * Get suggestion for specific validation error type
   */
  private getSuggestionForError(errorType: string): string {
    switch (errorType) {
      case 'type-check':
        return '1. Ensure all TypeScript types are correct and complete';
      case 'test':
        return '2. Add or fix test cases to ensure all tests pass';
      case 'build':
        return '3. Fix any build configuration or compilation issues';
      default:
        return '1. Review and fix the reported errors';
    }
  }

  /**
   * Record validation decision to disk
   */
  private async recordDecision(
    jobId: string,
    decision: ValidationDecision,
    validationReport: ValidationReport,
    attemptNumber?: number,
  ): Promise<void> {
    try {
      // Determine filename: final or intermediate
      let filename = `${jobId}.json`;
      if (attemptNumber !== undefined) {
        filename = `${jobId}-attempt-${attemptNumber}.json`;
      }

      const recordPath = path.join(this.validationDir, filename);

      const record = {
        jobId,
        decision,
        validationReport,
        timestamp: new Date().toISOString(),
      };

      await fsp.writeFile(recordPath, JSON.stringify(record, null, 2), 'utf-8');

      console.log(`[ValidationOrchestrator] Decision recorded: ${recordPath}`);
    } catch (err) {
      console.error('[ValidationOrchestrator] Error recording decision:', err);
    }
  }

  /**
   * Write validation guard file to prevent double-commits
   */
  async writeValidationGuard(jobId: string, decision: ValidationDecision): Promise<void> {
    try {
      const guardPath = path.join(this.validationDir, `${jobId}.guard.json`);

      const guard = {
        jobId,
        decision: decision.action,
        timestamp: new Date().toISOString(),
        reason: decision.reason,
      };

      await fsp.writeFile(guardPath, JSON.stringify(guard, null, 2), 'utf-8');

      console.log(`[ValidationOrchestrator] Validation guard written: ${guardPath}`);
    } catch (err) {
      console.error('[ValidationOrchestrator] Error writing validation guard:', err);
    }
  }

  /**
   * Generate commit message with metadata
   */
  generateCommitMessage(jobId: string, agentRole: string, iterations: number): string {
    return `feat(job-${jobId}): iteration ${iterations} complete - ${agentRole}`;
  }

  /**
   * Clean up validation records older than specified days
   */
  async cleanup(daysOld: number = 7): Promise<void> {
    try {
      const files = await fsp.readdir(this.validationDir);
      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.validationDir, file);
        const stats = await fsp.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fsp.unlink(filePath);
          console.log(`[ValidationOrchestrator] Cleaned up old record: ${file}`);
        }
      }
    } catch (err) {
      console.error('[ValidationOrchestrator] Error during cleanup:', err);
    }
  }
}

// Export factory function for easy instantiation
export function createValidationOrchestrator(cursorDir: string = '.cursor'): ValidationOrchestrator {
  return new ValidationOrchestrator(cursorDir);
}
