import { Job, Worker } from 'bullmq';
import { execa } from 'execa';

interface ValidationPayload {
  commands?: string[];
  cwd?: string;
}

const DEFAULT_COMMANDS = ['npm run validate-openapi', 'npm run validate-skills'];
const ALLOWED_PREFIXES = ['npm run ', 'npx ', 'node ', 'bash scripts/', './scripts/'];

function assertAllowed(command: string): void {
  if (!ALLOWED_PREFIXES.some((prefix) => command.startsWith(prefix))) {
    throw new Error(`Validation command not allowed: ${command}`);
  }
}

async function runCommand(command: string, cwd: string): Promise<{ command: string; stdout: string; stderr: string }> {
  assertAllowed(command);
  const [bin, ...args] = command.split(' ').filter(Boolean);
  const result = await execa(bin, args, { cwd, env: { ...process.env }, reject: false });
  if (result.exitCode !== 0) {
    throw new Error(`Validation failed: ${command}\n${result.stderr || result.stdout}`.slice(0, 2000));
  }
  return { command, stdout: result.stdout.slice(0, 4000), stderr: result.stderr.slice(0, 2000) };
}

export function startValidationWorker(connection: object) {
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (job.name !== 'maia_validation') return;
      const payload = (job.data?.payload ?? job.data ?? {}) as ValidationPayload;
      const commands = payload.commands && payload.commands.length > 0 ? payload.commands : DEFAULT_COMMANDS;
      const cwd = payload.cwd?.trim() || process.cwd();
      const results = [];
      for (const command of commands) {
        results.push(await runCommand(command, cwd));
      }
      return { success: true, results };
    },
    { connection, concurrency: 1 }
  );
}
