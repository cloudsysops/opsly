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
  if (folders.highlightsDir && isInside(filePath, folders.highlightsDir)) {
    return { cmd: 'prepare-highlight', args: ['--tenant', 'icso-gaming-tbd', '--file', filePath] };
  }
  if (folders.obsRecordingsDir && isInside(filePath, folders.obsRecordingsDir)) {
    return { cmd: 'prepare-highlight', args: ['--tenant', 'icso-gaming-tbd', '--file', filePath] };
  }
  if (isInside(filePath, folders.instantReplayDir)) {
    return {
      cmd: 'prepare-session',
      args: ['--tenant', 'icso-gaming-tbd', '--file', filePath],
    };
  }
  throw new Error(`gameplay file is outside configured folders: ${filePath}`);
}

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.mkv', '.webm']);
const STABLE_CHECK_DELAY_MS = 5000;

// NVIDIA ShadowPlay writes recordings under one per-game subfolder each
// (e.g. "Videos\NVIDIA\Valorant\*.mp4"), not as flat files directly inside
// the configured capture root — so a plain readdirSync of the root never
// finds anything. One level of recursion matches the real layout without
// walking an unbounded tree.
export function listVideoFiles(directory) {
  const files = [];
  for (const name of readdirSync(directory)) {
    const entryPath = path.join(directory, name);
    let entryStat;
    try {
      entryStat = statSync(entryPath);
    } catch {
      continue;
    }
    if (entryStat.isDirectory()) {
      for (const nestedName of readdirSync(entryPath)) {
        const nestedPath = path.join(entryPath, nestedName);
        if (VIDEO_EXTENSIONS.has(path.extname(nestedPath).toLowerCase())) {
          files.push(nestedPath);
        }
      }
    } else if (VIDEO_EXTENSIONS.has(path.extname(entryPath).toLowerCase())) {
      files.push(entryPath);
    }
  }
  return files;
}

function runCli(cmd, args) {
  const command =
    cmd === 'prepare-highlight' || cmd === 'prepare-session'
      ? ['python3', 'scripts/ops/pc-gamer-clip-agent.py', '--pipeline', cmd, ...args]
      : ['npx', 'tsx', 'scripts/content-os-cli.ts', cmd, ...args];
  return new Promise((resolve, reject) => {
    const child = spawn(command[0], command.slice(1), { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function pollOnce(config) {
  const seen = new Set(loadDedupState(config.statePath));
  const sourceDirs = [config.instantReplayDir, config.highlightsDir, config.obsRecordingsDir].filter(
    (directory) => directory && existsSync(directory),
  );
  const candidates = [...new Set(sourceDirs.flatMap((directory) => listVideoFiles(directory)))].filter(
    (filePath) => !seen.has(filePath),
  );

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
    obsRecordingsDir: process.env.OBS_RECORDINGS_DIR,
    statePath: process.env.WATCHER_STATE_PATH ?? path.join(process.cwd(), '.pc-gamer-watcher-state.json'),
  };
  if (!config.instantReplayDir) {
    throw new Error('NVIDIA_INSTANT_REPLAY_DIR must be set');
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
