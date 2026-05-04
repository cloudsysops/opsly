import { execSync, spawn } from 'child_process';
import { promises as fsp } from 'fs';
import * as path from 'path';

interface ValidationResult {
  type: 'type-check' | 'test' | 'build';
  status: 'passed' | 'failed' | 'skipped';
  duration_ms?: number;
  error?: string;
  stdout?: string;
  stderr?: string;
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

/**
 * TestValidatorWorker
 *
 * Monitors .cursor/responses/ for new response files
 * Runs validation suite on generated code:
 *   1. npm run type-check (TypeScript)
 *   2. npm run test (Unit tests)
 *   3. npm run build (Build validation)
 *
 * Writes results to response-{id}.validation.json
 * Enables IterationManager to decide: commit vs iterate vs escalate
 */
export class TestValidatorWorker {
  private responsesDir: string;
  private processedFiles = new Set<string>();
  private cursorDir: string;

  constructor(cursorDir: string = '.cursor') {
    this.cursorDir = cursorDir;
    this.responsesDir = path.join(cursorDir, 'responses');
  }

  private extractJobId(filename: string): string {
    // response-{job_id}.md → {job_id}
    const match = filename.match(/^response-(.+)\.md$/);
    return match ? match[1] : filename;
  }

  private extractWorkspaces(responseContent: string): string[] {
    // Simple heuristic: look for common workspace names in the response
    const workspaces = new Set<string>();
    const workspaceNames = [
      'orchestrator',
      'api',
      'frontend',
      'admin',
      'portal',
      'llm-gateway',
      'context-builder',
      'mcp',
      'supabase',
    ];

    for (const wsName of workspaceNames) {
      if (responseContent.toLowerCase().includes(`@intcloudsysops/${wsName}`)) {
        workspaces.add(wsName);
      }
    }

    return Array.from(workspaces);
  }

  private runValidation(type: 'type-check' | 'test' | 'build', workspaces?: string[]): ValidationResult {
    const startTime = Date.now();

    try {
      let command = '';
      let args: string[] = [];

      switch (type) {
        case 'type-check':
          command = 'npm run type-check';
          if (workspaces && workspaces.length > 0) {
            command += ` -- --workspace=${workspaces[0]}`;
          }
          break;
        case 'test':
          command = 'npm run test';
          if (workspaces && workspaces.length > 0) {
            command += ` --workspace=@intcloudsysops/${workspaces[0]}`;
          }
          break;
        case 'build':
          command = 'npm run build';
          if (workspaces && workspaces.length > 0) {
            command += ` --workspace=@intcloudsysops/${workspaces[0]}`;
          }
          break;
      }

      console.log(`[TestValidator] Running: ${command}`);

      const result = execSync(command, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
      });

      const duration = Date.now() - startTime;

      return {
        type,
        status: 'passed',
        duration_ms: duration,
        stdout: result.substring(0, 1000), // First 1000 chars
      };
    } catch (err) {
      const duration = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Try to extract useful error info
      let stdout = '';
      let stderr = '';

      if (err instanceof Error && 'stdout' in err) {
        stdout = String((err as any).stdout || '').substring(0, 500);
      }
      if (err instanceof Error && 'stderr' in err) {
        stderr = String((err as any).stderr || '').substring(0, 500);
      }

      return {
        type,
        status: 'failed',
        duration_ms: duration,
        error: errorMsg.substring(0, 500),
        stdout,
        stderr,
      };
    }
  }

  async validateResponse(filePath: string): Promise<void> {
    try {
      const filename = path.basename(filePath);
      const jobId = this.extractJobId(filename);

      // Skip if already processed
      if (this.processedFiles.has(filename)) {
        return;
      }
      this.processedFiles.add(filename);

      console.log(`[TestValidator] Validating ${filename} (job: ${jobId})`);

      // Read response content
      const content = await fsp.readFile(filePath, 'utf-8');

      // Extract attempt number from metadata or filename
      let attempt = 1;
      if (filename.includes('-attempt-')) {
        const match = filename.match(/-attempt-(\d+)/);
        if (match) {
          attempt = Number.parseInt(match[1], 10);
        }
      }

      // Detect affected workspaces
      const workspaces = this.extractWorkspaces(content);
      console.log(`[TestValidator] Detected workspaces: ${workspaces.join(', ') || 'none'}`);

      // Run validation suite
      console.log(`[TestValidator] Starting validation suite (attempt ${attempt})...`);
      const startTime = Date.now();

      const validations: ValidationResult[] = [];

      // 1. Type-check
      console.log('[TestValidator] 1/3 Running type-check...');
      validations.push(this.runValidation('type-check', workspaces));

      // 2. Tests (if type-check passed)
      if (validations[0]?.status === 'passed') {
        console.log('[TestValidator] 2/3 Running tests...');
        validations.push(this.runValidation('test', workspaces));
      } else {
        validations.push({ type: 'test', status: 'skipped' });
      }

      // 3. Build (if type-check and tests passed)
      if (validations[0]?.status === 'passed' && validations[1]?.status !== 'failed') {
        console.log('[TestValidator] 3/3 Running build...');
        validations.push(this.runValidation('build', workspaces));
      } else {
        validations.push({ type: 'build', status: 'skipped' });
      }

      const totalDuration = Date.now() - startTime;

      // Determine overall status
      const allPassed = validations.every((v) => v.status === 'passed' || v.status === 'skipped');
      const overallStatus = allPassed ? 'passed' : 'failed';

      // Collect errors
      const errors = validations
        .filter((v) => v.status === 'failed')
        .map((v) => ({
          type: v.type,
          message: v.error || 'Unknown error',
        }));

      // Determine next action
      let nextAction: 'commit' | 'iterate' | 'escalate' = 'commit';
      if (overallStatus === 'failed') {
        nextAction = attempt < 3 ? 'iterate' : 'escalate';
      }

      const report: ValidationReport = {
        job_id: jobId,
        timestamp: new Date().toISOString(),
        attempt,
        validations,
        overall_status: overallStatus,
        can_retry: attempt < 3,
        next_action: nextAction,
        total_duration_ms: totalDuration,
        errors,
      };

      // Write validation report
      const reportPath = filePath.replace(/\.md$/, '.validation.json');
      await fsp.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');

      // Log summary
      const statusEmoji = overallStatus === 'passed' ? '✅' : '❌';
      console.log(
        `[TestValidator] ${statusEmoji} Validation complete (${totalDuration}ms, attempt ${attempt})`,
      );
      console.log(`[TestValidator] Result: ${overallStatus} | Next action: ${nextAction}`);

      if (errors.length > 0) {
        console.log('[TestValidator] Errors:');
        errors.forEach((e) => {
          console.log(`  - [${e.type}] ${e.message}`);
        });
      }
    } catch (err) {
      console.error('[TestValidator] Fatal error:', err);
    }
  }

  /**
   * Start monitoring .cursor/responses/ for changes
   * Automatically validates new response files
   */
  async start(): Promise<void> {
    console.log(`[TestValidator] Starting, watching ${this.responsesDir}`);

    // Ensure directory exists
    try {
      await fsp.mkdir(this.responsesDir, { recursive: true });
    } catch (err) {
      console.error('[TestValidator] Failed to create responses dir:', err);
    }

    // Import chokidar for file watching
    try {
      const { watch } = await import('chokidar');

      const watcher = watch(`${this.responsesDir}/*.md`, {
        persistent: true,
        ignored: [
          '**/.validation.json',
          '**/.*',
          '**/*.validation.json',
        ],
      });

      watcher.on('add', (filePath: string) => {
        const filename = path.basename(filePath);
        if (!filename.endsWith('.validation.json')) {
          console.log(`[TestValidator] Detected new response: ${filename}`);
          void this.validateResponse(filePath);
        }
      });

      watcher.on('error', (err: unknown) => {
        console.error('[TestValidator] Watcher error:', err);
      });

      console.log('[TestValidator] Ready. Watching for response files...');
    } catch (err) {
      console.error('[TestValidator] Failed to start watcher:', err);
    }
  }
}

// Export singleton
let instance: TestValidatorWorker | null = null;

export function startTestValidatorWorker(cursorDir?: string): TestValidatorWorker {
  if (instance) {
    return instance;
  }

  instance = new TestValidatorWorker(cursorDir);
  void instance.start();
  return instance;
}
