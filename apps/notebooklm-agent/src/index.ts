import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Resuelve client.py junto al JS compilado (dist/) o en desarrollo (src/). */
export function resolvePythonClientPath(): string {
  return join(__dirname, 'client.py');
}

export interface NotebookLMCommand {
  action: string;
  tenant_slug: string;
  notebook_id?: string;
  url?: string;
  text?: string;
  title?: string;
  path?: string;
  question?: string;
  query?: string;
  instructions?: string;
  output_path?: string;
  quiz_output_path?: string;
  orientation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  mode?: 'fast' | 'deep';
  name?: string;
  source_type?: 'url' | 'text' | 'file';
  auto_import?: boolean;
  research_source?: 'web' | 'drive';
}

export interface NotebookLMResult {
  success: boolean;
  error?: string;
  notebook_id?: string;
  output_path?: string;
  answer?: string;
  quiz?: unknown;
  quiz_path?: string;
  sources_added?: number;
  tenant_slug?: string;
  task_id?: string;
}

export interface NotebookLMTool {
  name: 'notebooklm';
  description: string;
  requiredScope: 'agents:write';
  execute: (command: NotebookLMCommand) => Promise<NotebookLMResult>;
}

function runPythonClient(command: NotebookLMCommand): Promise<string> {
  const script = resolvePythonClientPath();
  return new Promise((resolve, reject) => {
    const child = spawn('python3', [script], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });
    let out = '';
    let err = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (c: string) => {
      out += c;
    });
    child.stderr.on('data', (c: string) => {
      err += c;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(err || `python3 exit ${code}`));
        return;
      }
      resolve(out.trim());
    });
    child.stdin.write(JSON.stringify(command));
    child.stdin.end();
  });
}

/** Invoca `client.py` vía stdin (sin shell) para evitar inyección en JSON. */
export async function executeNotebookLM(command: NotebookLMCommand): Promise<NotebookLMResult> {
  try {
    const stdout = await runPythonClient(command);
    return JSON.parse(stdout) as NotebookLMResult;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error desconocido',
    };
  }
}

/**
 * Lightweight tool wrapper reusable by MCP servers.
 * Enforced as experimental through NOTEBOOKLM_ENABLED in Python client.
 */
export const notebookLMTool: NotebookLMTool = {
  name: 'notebooklm',
  description:
    'NotebookLM experimental tool: create notebook, add sources, and generate artifacts.',
  requiredScope: 'agents:write',
  execute: executeNotebookLM,
};
