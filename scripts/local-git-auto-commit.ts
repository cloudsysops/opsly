import { watch } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { spawn } from 'node:child_process';

interface Options {
  watchDir: string;
  autoPush: boolean;
  remote: string;
}

function argValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function parseOptions(): Options {
  return {
    watchDir: resolve(argValue('--watch-dir') || '.cursor/responses'),
    autoPush: process.argv.includes('--auto-push'),
    remote: argValue('--remote') || 'origin',
  };
}

async function runGit(args: string[]): Promise<string> {
  return new Promise((resolveRun, reject) => {
    const child = spawn('git', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk: Buffer) => {
      out += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      err += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolveRun(out.trim());
      } else {
        reject(new Error(err.trim() || `git ${args.join(' ')} exited with ${code ?? 'unknown'}`));
      }
    });
  });
}

async function branchName(): Promise<string> {
  return runGit(['branch', '--show-current']);
}

async function changedPaths(): Promise<string[]> {
  const raw = await runGit(['status', '--porcelain']);
  if (raw.length === 0) {
    return [];
  }
  return raw
    .split('\n')
    .map((line) => line.slice(3).trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const renamed = line.split(' -> ');
      return renamed[renamed.length - 1] ?? line;
    });
}

async function commitResponse(filePath: string, options: Options, baseline: Set<string>): Promise<void> {
  await access(filePath);
  const title = basename(filePath).replace(/[^a-zA-Z0-9._-]/g, '-');
  const jobMatch = title.match(/response-([^-]+)-/);
  const jobId = jobMatch?.[1] || 'local';
  const currentChanges = await changedPaths();
  const newChanges = currentChanges.filter((path) => !baseline.has(path));
  await runGit(['add', filePath, ...newChanges]);
  const diff = await runGit(['diff', '--cached', '--name-only']);
  if (diff.length === 0) {
    return;
  }
  await runGit(['commit', '-m', `feat(job-${jobId}): local agent response ${title}`]);
  if (options.autoPush) {
    const branch = await branchName();
    if (branch.length > 0) {
      await runGit(['push', options.remote, branch]);
    }
  }
  process.stdout.write(`[local-git-auto-commit] committed ${filePath}\n`);
}

void (async () => {
  const options = parseOptions();
  await mkdir(options.watchDir, { recursive: true });
  const baseline = new Set(await changedPaths());
  process.stdout.write(`[local-git-auto-commit] watching ${options.watchDir}\n`);
  watch(options.watchDir, (event, filename) => {
    if (event !== 'rename' || !filename || !filename.endsWith('.md')) {
      return;
    }
    void commitResponse(resolve(options.watchDir, filename), options, baseline).catch((err) => {
      process.stderr.write(`[local-git-auto-commit] ${err instanceof Error ? err.message : String(err)}\n`);
    });
  });
})().catch((err) => {
  process.stderr.write(`[local-git-auto-commit] ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
