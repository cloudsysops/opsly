import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ToolManifest } from './types.js';

const execFileAsync = promisify(execFile);

interface RunTestsInput {
  workspace?: string;
  pattern?: string;
}

interface TestResult {
  ok: boolean;
  passed: number;
  failed: number;
  errors: string[];
  output: string;
  duration_ms: number;
}

export const RunTestsTool: ToolManifest = {
  name: 'run_tests',
  description: 'Ejecuta los tests de un workspace específico y reporta resultados (pass/fail/errors)',
  capabilities: ['testing', 'diagnostics', 'quality-assurance'],
  riskLevel: 'low',
  async execute(input: unknown): Promise<TestResult> {
    let workspace = '';
    if (typeof input === 'object' && input !== null) {
      const obj = input as Record<string, unknown>;
      if (typeof obj.workspace === 'string') {
        workspace = obj.workspace.trim();
      }
    }

    const start = Date.now();

    try {
      const args: string[] = ['run', 'test'];
      if (workspace) {
        args.push(`--workspace=${workspace}`);
      }

      const { stdout, stderr } = await execFileAsync('npm', args, {
        timeout: 300_000, // 5 min por tests
        maxBuffer: 5 * 1024 * 1024, // 5 MB
        cwd: process.cwd(),
      });

      const output = stdout.toString() + (stderr ? '\n' + stderr.toString() : '');

      // Parse test results from vitest/jest output
      const passedMatch = output.match(/(\d+)\s+passed/);
      const failedMatch = output.match(/(\d+)\s+failed/);

      const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
      const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;

      const errors = failed > 0 ? [output.slice(-500)] : []; // últimos 500 chars si hay errores

      return {
        ok: failed === 0,
        passed,
        failed,
        errors,
        output: output.slice(-1000), // últimos 1000 chars
        duration_ms: Date.now() - start,
      };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        passed: 0,
        failed: 0,
        errors: [error],
        output: error,
        duration_ms: Date.now() - start,
      };
    }
  },
};
