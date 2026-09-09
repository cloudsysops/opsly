#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

export function isFileStable(statBefore, statAfter) {
  return statBefore.size > 0 && statBefore.size === statAfter.size;
}

export function loadDedupState(statePath) {
  if (!existsSync(statePath)) return [];
  try {
    const value = JSON.parse(readFileSync(statePath, 'utf8'));
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function saveDedupState(statePath, processedPaths) {
  mkdirSync(path.dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify([...new Set(processedPaths)].sort(), null, 2)}\n`);
}

function isInside(filePath, root) {
  const relative = path.relative(path.resolve(root), path.resolve(filePath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function pickCommand(filePath, folders) {
  if (isInside(filePath, folders.highlightsDir)) {
    return { cmd: 'prepare-highlight', args: ['--tenant', 'icso-gaming-tbd', '--file', filePath] };
  }
  if (isInside(filePath, folders.instantReplayDir)) {
    return {
      cmd: 'ingest',
      args: ['--tenant', 'icso-gaming-tbd', '--mode', 'original', '--file', filePath],
    };
  }
  throw new Error(`gameplay file is outside configured folders: ${filePath}`);
}

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.mkv', '.webm']);
const STABLE_CHECK_DELAY_MS = 5000;

function runCli(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', 'scripts/content-os-cli.ts', cmd, ...args], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function pollOnce(config) {
  const seen = new Set(loadDedupState(config.statePath));
  const candidates = [
    ...readdirSync(config.instantReplayDir).map((name) => path.join(config.instantReplayDir, name)),
    ...readdirSync(config.highlightsDir).map((name) => path.join(config.highlightsDir, name)),
  ].filter((filePath) => VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase()) && !seen.has(filePath));

  for (const filePath of candidates) {
    const before = statSync(filePath);
    await new Promise((resolve) => setTimeout(resolve, STABLE_CHECK_DELAY_MS));
    const after = statSync(filePath);
    if (!isFileStable(before, after)) continue;

    const { cmd, args } = pickCommand(filePath, config);
    try {
      await runCli(cmd, args);
      seen.add(filePath);
      saveDedupState(config.statePath, [...seen]);
    } catch (error) {
      console.error(`[watcher] failed to process ${filePath}:`, error instanceof Error ? error.message : error);
    }
  }
}

async function main() {
  const config = {
    instantReplayDir: process.env.NVIDIA_INSTANT_REPLAY_DIR,
    highlightsDir: process.env.NVIDIA_HIGHLIGHTS_DIR,
    statePath: process.env.WATCHER_STATE_PATH ?? path.join(process.cwd(), '.pc-gamer-watcher-state.json'),
  };
  if (!config.instantReplayDir || !config.highlightsDir) {
    throw new Error('NVIDIA_INSTANT_REPLAY_DIR and NVIDIA_HIGHLIGHTS_DIR must be set');
  }
  while (true) {
    await pollOnce(config).catch((error) => console.error('[watcher] poll failed:', error.message));
    await new Promise((resolve) => setTimeout(resolve, 60_000));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`[watcher] ${error.message}`);
    process.exitCode = 1;
  });
}
