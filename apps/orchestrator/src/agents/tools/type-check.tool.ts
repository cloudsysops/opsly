import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ToolManifest } from './types.js';

const execFileAsync = promisify(execFile);

interface TypeCheckResult {
  ok: boolean;
  errors_count: number;
  errors: string[];
  output: string;
  duration_ms: number;
}

export const TypeCheckTool: ToolManifest = {
  name: 'type_check',
  description: 'Ejecuta npm run type-check para validar TypeScript sin errores',
  capabilities: ['quality-assurance', 'validation', 'typescript'],
  riskLevel: 'low',
  async execute(input: unknown): Promise<TypeCheckResult> {
    const start = Date.now();

    try {
      const { stdout, stderr } = await execFileAsync('npm', ['run', 'type-check'], {
        timeout: 120_000, // 2 min
        maxBuffer: 2 * 1024 * 1024, // 2 MB
        cwd: process.cwd(),
      });

      const output = stdout.toString() + (stderr ? '\n' + stderr.toString() : '');

      // Si npm run type-check hace exit 0, no hay errores
      return {
        ok: true,
        errors_count: 0,
        errors: [],
        output: output.slice(-500),
        duration_ms: Date.now() - start,
      };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      // Extraer errores del output
      const lines = error.split('\n');
      const errors = lines.filter(
        (l) => l.includes('error') || l.includes('Error') || l.includes('TS')
      );

      return {
        ok: false,
        errors_count: errors.length,
        errors,
        output: error.slice(-1000),
        duration_ms: Date.now() - start,
      };
    }
  },
};
