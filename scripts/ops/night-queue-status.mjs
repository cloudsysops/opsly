#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { loadNightQueueCandidates } from './night-queue-candidates.mjs';

async function readJson(file, fallback={}) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
}

const TERMINAL_STATUSES = new Set(['done', 'completed']);
const WEAK_STATUSES = new Set(['unknown', 'processing', 'queued', 'running']);

/**
 * Prefer definitive file/frontmatter done over stale .metadata.json "unknown".
 * Normalize frontmatter `done` → `completed` for display counts.
 */
export function resolveEffectiveStatus(task) {
  const candidates = [task.job_status, task.local_status, task.tracked_status]
    .map((s) => (typeof s === 'string' ? s.trim() : s))
    .filter(Boolean);

  const terminal = candidates.find((s) => TERMINAL_STATUSES.has(s));
  if (terminal) return terminal === 'done' ? 'completed' : terminal;

  const strong = candidates.find((s) => !WEAK_STATUSES.has(s));
  if (strong) return strong;

  return candidates[0] ?? 'unknown';
}

export async function buildNightQueueStatus({ trackedDir, localQueueDir }) {
  const tracked = await loadNightQueueCandidates(trackedDir);
  const metadata = await readJson(path.join(localQueueDir, '.metadata.json'), {});
  const localFiles = new Map();

  try {
    for (const entry of await fs.readdir(localQueueDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const content = await fs.readFile(path.join(localQueueDir, entry.name), 'utf8');
      const match = content.match(/^status:\s*([^\n\r]+)/m);
      localFiles.set(entry.name, match?.[1]?.trim() ?? 'unknown');
    }
  } catch {}

  const tasks = tracked.map((task) => {
    const meta = metadata[task.file] ?? null;
    const localStatus = localFiles.get(task.file) ?? null;
    return {
      id: task.id,
      file: task.file,
      tracked_status: task.status,
      local_status: localStatus,
      job_status: meta?.status ?? null,
      job_id: meta?.jobId ?? null,
      agent: meta?.agent ?? task.runtime ?? null,
      submitted_at: meta?.submittedAt ?? null,
      completed_at: meta?.completedAt ?? null,
      error: meta?.error ?? null,
    };
  });

  const counts = {};
  for (const task of tasks) {
    const state = resolveEffectiveStatus(task);
    counts[state] = (counts[state] ?? 0) + 1;
  }

  return {
    generated_at: new Date().toISOString(),
    tracked_source: trackedDir,
    local_source: localQueueDir,
    counts,
    tasks,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.cwd();
  const trackedDir = process.env.NIGHT_QUEUE_TRACKED_DIR ?? path.join(root, 'docs/01-development/night-queue');
  const localQueueDir = process.env.PROMPT_QUEUE_DIR ?? path.join(root, '.cursor/prompts/queue');
  const result = await buildNightQueueStatus({ trackedDir, localQueueDir });

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('OPSLY NIGHT QUEUE STATUS');
    console.log(`generated: ${result.generated_at}`);
    console.log('counts:', Object.entries(result.counts).map(([k,v]) => `${k}=${v}`).join(' '));
    for (const task of result.tasks) {
      const state = resolveEffectiveStatus(task);
      console.log(`- ${task.id}: ${state}${task.agent ? ` [${task.agent}]` : ''}${task.job_id ? ` job=${task.job_id}` : ''}`);
    }
  }
}
