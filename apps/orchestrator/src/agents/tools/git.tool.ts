import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ToolManifest } from './types.js';

const execFileAsync = promisify(execFile);

interface GitAction {
  action: 'status' | 'add' | 'commit' | 'log' | 'branch' | 'diff';
  files?: string[]; // para 'add'
  message?: string; // para 'commit'
  lines?: number; // para 'log'
}

interface GitResult {
  ok: boolean;
  action: string;
  output: string;
  error?: string;
}

const SAFE_FILES_PATTERN = /^[a-zA-Z0-9._\-/]+$/;

function isSafeFilePath(path: string): boolean {
  return SAFE_FILES_PATTERN.test(path) && !path.includes('..') && !path.includes('~');
}

export const GitTool: ToolManifest = {
  name: 'git_command',
  description:
    'Ejecuta operaciones git seguras: status, add, commit, log, branch, diff. Sin push automático.',
  capabilities: ['version-control', 'git', 'development'],
  riskLevel: 'medium',
  async execute(input: unknown): Promise<GitResult> {
    if (typeof input !== 'object' || input === null) {
      return {
        ok: false,
        action: 'unknown',
        output: '',
        error: 'Input must be an object with action property',
      };
    }

    const req = input as Record<string, unknown>;
    const action = req.action as string | undefined;

    if (!action) {
      return {
        ok: false,
        action: 'unknown',
        output: '',
        error: 'Missing "action" field (status|add|commit|log|branch|diff)',
      };
    }

    try {
      const start = Date.now();

      switch (action) {
        case 'status': {
          const { stdout } = await execFileAsync('git', ['status', '--short'], {
            timeout: 10_000,
            cwd: process.cwd(),
          });
          return {
            ok: true,
            action: 'status',
            output: stdout.toString(),
          };
        }

        case 'add': {
          const files = Array.isArray(req.files) ? req.files : [];
          const safeFiles = files
            .filter((f): f is string => typeof f === 'string')
            .filter(isSafeFilePath);

          if (safeFiles.length === 0) {
            return {
              ok: false,
              action: 'add',
              output: '',
              error: 'No safe files to add',
            };
          }

          await execFileAsync('git', ['add', ...safeFiles], {
            timeout: 10_000,
            cwd: process.cwd(),
          });

          return {
            ok: true,
            action: 'add',
            output: `Added ${safeFiles.length} files`,
          };
        }

        case 'commit': {
          const message = typeof req.message === 'string' ? req.message.trim() : '';
          if (!message) {
            return {
              ok: false,
              action: 'commit',
              output: '',
              error: 'Missing commit message',
            };
          }

          const { stdout } = await execFileAsync('git', ['commit', '-m', message], {
            timeout: 10_000,
            cwd: process.cwd(),
          });

          return {
            ok: true,
            action: 'commit',
            output: stdout.toString(),
          };
        }

        case 'log': {
          const lines = typeof req.lines === 'number' ? req.lines : 5;
          const { stdout } = await execFileAsync('git', [
            'log',
            `--oneline`,
            `-${Math.min(lines, 20)}`,
          ]);

          return {
            ok: true,
            action: 'log',
            output: stdout.toString(),
          };
        }

        case 'branch': {
          const { stdout } = await execFileAsync('git', ['branch', '--show-current'], {
            timeout: 5_000,
            cwd: process.cwd(),
          });

          return {
            ok: true,
            action: 'branch',
            output: stdout.toString().trim(),
          };
        }

        case 'diff': {
          const { stdout } = await execFileAsync('git', ['diff', '--stat'], {
            timeout: 10_000,
            maxBuffer: 1024 * 1024,
            cwd: process.cwd(),
          });

          return {
            ok: true,
            action: 'diff',
            output: stdout.toString().slice(-2000), // últimos 2000 chars
          };
        }

        default:
          return {
            ok: false,
            action,
            output: '',
            error: `Unknown action: ${action}. Allowed: status, add, commit, log, branch, diff`,
          };
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        action,
        output: '',
        error,
      };
    }
  },
};
