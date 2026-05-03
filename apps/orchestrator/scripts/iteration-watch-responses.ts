/**
 * Vigila `.cursor/responses/validation-*.json` (generados por TestValidatorWorker)
 * y, si fallan, escribe prompts de reintento bajo `.cursor/prompts/`.
 *
 * Uso (desde la raíz del monorepo, con tsx del workspace orchestrator):
 *   OPSLY_REPO_ROOT=$PWD PLATFORM_ADMIN_TOKEN=… npx tsx apps/orchestrator/scripts/iteration-watch-responses.ts
 *
 * Opcional: OPSLY_ITERATION_AUTO_SUBMIT=true re-envía el nuevo prompt vía POST /api/local/prompt-submit.
 */
import { randomUUID } from 'node:crypto';
import { watch } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import {
  MAX_AUTO_ITERATIONS,
  buildRetryPromptMarkdown,
  type ValidationReportSummary,
} from '../src/lib/iteration-manager.js';

interface Options {
  repoRoot: string;
  orchestratorUrl: string;
  token: string;
  tenantSlug: string;
  autoSubmit: boolean;
}

interface IterationStateFile {
  /** correlation_id → número de prompts auto-reintento ya emitidos */
  retry_prompts_emitted: Record<string, number>;
}

function argValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function parseOptions(): Options {
  const repoRoot = resolve(argValue('--repo-root') || process.env.OPSLY_REPO_ROOT || process.cwd());
  return {
    repoRoot,
    orchestratorUrl: (argValue('--orchestrator-url') || 'http://localhost:3011').replace(/\/+$/, ''),
    token: argValue('--token') || process.env.PLATFORM_ADMIN_TOKEN || '',
    tenantSlug: argValue('--tenant-slug') || process.env.OPSLY_LOCAL_TENANT_SLUG || 'opsly',
    autoSubmit: process.env.OPSLY_ITERATION_AUTO_SUBMIT === 'true',
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseValidationReport(raw: unknown): ValidationReportSummary | null {
  if (!isRecord(raw)) {
    return null;
  }
  const ok = raw.ok === true;
  const correlationId = typeof raw.correlation_id === 'string' ? raw.correlation_id : '';
  if (correlationId.length === 0) {
    return null;
  }
  const attempt = typeof raw.attempt === 'number' && Number.isFinite(raw.attempt) ? raw.attempt : 0;
  const failedStep = raw.failed_step;
  const step =
    failedStep === 'type-check' || failedStep === 'test' || failedStep === 'build' ? failedStep : undefined;
  const exitCode = typeof raw.exit_code === 'number' && Number.isFinite(raw.exit_code) ? raw.exit_code : undefined;
  const logTail = typeof raw.log_tail === 'string' ? raw.log_tail : '';
  const sourcePromptPath =
    typeof raw.source_prompt_path === 'string' ? raw.source_prompt_path : undefined;
  return {
    ok,
    correlation_id: correlationId,
    attempt,
    failed_step: step,
    exit_code: exitCode,
    log_tail: logTail,
    source_prompt_path: sourcePromptPath,
  };
}

async function readState(path: string): Promise<IterationStateFile> {
  try {
    const raw = await readFile(path, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return { retry_prompts_emitted: {} };
    }
    const r = parsed.retry_prompts_emitted;
    const map: Record<string, number> = {};
    if (isRecord(r)) {
      for (const [k, v] of Object.entries(r)) {
        if (typeof v === 'number' && Number.isFinite(v)) {
          map[k] = v;
        }
      }
    }
    return { retry_prompts_emitted: map };
  } catch {
    return { retry_prompts_emitted: {} };
  }
}

async function writeState(path: string, state: IterationStateFile): Promise<void> {
  await mkdir(resolve(path, '..'), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
}

async function submitPromptPath(promptPath: string, options: Options): Promise<void> {
  const requestId = randomUUID();
  const res = await fetch(`${options.orchestratorUrl}/api/local/prompt-submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.token}`,
      'Content-Type': 'application/json',
      'x-autonomy-approved': 'true',
    },
    body: JSON.stringify({
      tenant_slug: options.tenantSlug,
      request_id: requestId,
      prompt_path: promptPath,
      local_agent: 'cursor',
      agent_role: 'executor',
      max_steps: 5,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`prompt-submit ${String(res.status)}: ${t}`);
  }
}

const debounce = new Map<string, ReturnType<typeof setTimeout>>();

async function handleValidationJson(absPath: string, options: Options): Promise<void> {
  const rawText = await readFile(absPath, 'utf-8');
  const parsed: unknown = JSON.parse(rawText);
  const summary = parseValidationReport(parsed);
  if (!summary || summary.ok) {
    return;
  }

  const statePath = join(options.repoRoot, '.cursor', 'iteration-state.json');
  const state = await readState(statePath);
  const cid = summary.correlation_id;
  const emitted = state.retry_prompts_emitted[cid] ?? 0;
  if (emitted >= MAX_AUTO_ITERATIONS) {
    process.stderr.write(
      `[iteration-watch] correlation ${cid}: max auto retries (${String(MAX_AUTO_ITERATIONS)}) reached; skip.\n`
    );
    return;
  }

  const nextIdx = emitted + 1;
  const md = buildRetryPromptMarkdown({
    summary,
    nextAttempt: nextIdx,
    maxAttempts: MAX_AUTO_ITERATIONS,
    originalGoal: undefined,
  });

  const promptsDir = join(options.repoRoot, '.cursor', 'prompts');
  await mkdir(promptsDir, { recursive: true });
  const slug = cid.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  const outName = `auto-retry-${String(nextIdx)}-${slug}.md`;
  const outPath = join(promptsDir, outName);
  await writeFile(outPath, md, 'utf-8');

  state.retry_prompts_emitted[cid] = nextIdx;
  await writeState(statePath, state);
  process.stdout.write(`[iteration-watch] wrote ${outPath}\n`);

  if (options.autoSubmit) {
    if (options.token.length === 0) {
      process.stderr.write('[iteration-watch] auto-submit skipped: PLATFORM_ADMIN_TOKEN empty\n');
      return;
    }
    await submitPromptPath(outPath, options);
    process.stdout.write(`[iteration-watch] submitted ${outPath} to orchestrator\n`);
  }
}

void (async () => {
  const options = parseOptions();
  const responsesDir = join(options.repoRoot, '.cursor', 'responses');
  await mkdir(responsesDir, { recursive: true });
  process.stdout.write(`[iteration-watch] watching ${responsesDir}\n`);

  watch(responsesDir, (event, filename) => {
    if (!filename || !filename.startsWith('validation-') || !filename.endsWith('.json')) {
      return;
    }
    if (event !== 'rename' && event !== 'change') {
      return;
    }
    const abs = join(responsesDir, filename);
    const key = basename(filename);
    const prev = debounce.get(key);
    if (prev) {
      clearTimeout(prev);
    }
    debounce.set(
      key,
      setTimeout(() => {
        debounce.delete(key);
        void handleValidationJson(abs, options).catch((err) => {
          process.stderr.write(
            `[iteration-watch] ${err instanceof Error ? err.message : String(err)}\n`
          );
        });
      }, 400)
    );
  });
})().catch((err) => {
  process.stderr.write(`[iteration-watch] ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
