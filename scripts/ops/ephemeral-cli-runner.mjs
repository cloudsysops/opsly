#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const configPath = process.argv[2];
if (!configPath) {
  console.error('usage: ephemeral-cli-runner.mjs <config.json>');
  process.exit(2);
}

const config = JSON.parse(await readFile(configPath, 'utf8'));
const limit = Number(config.outputLimitBytes || 120000);

function appendLimited(current, chunk) {
  const next = current + chunk.toString();
  if (Buffer.byteLength(next, 'utf8') <= limit) return next;
  return Buffer.from(next).subarray(0, limit).toString('utf8') + '\n[opsly] output truncated';
}

let stdout = '';
let stderr = '';
let exitCode = 1;

try {
  const child = spawn(config.command, config.args || [], {
    cwd: config.cwd,
    env: config.env || {},
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => { stdout = appendLimited(stdout, chunk); });
  child.stderr.on('data', (chunk) => { stderr = appendLimited(stderr, chunk); });
  exitCode = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 1));
  });
} catch (error) {
  stderr = appendLimited(stderr, Buffer.from(error instanceof Error ? error.message : String(error)));
  exitCode = 1;
}

await writeFile(config.resultPath, JSON.stringify({ stdout, stderr, exitCode }), { mode: 0o600 });
process.exit(exitCode);
