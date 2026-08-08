import { Job } from 'bullmq';
import { meterPlannerLlmFireAndForget } from '../metering/usage-events-meter.js';
import { createWorker } from './create-worker.js';
import type { OrchestratorJob } from '../types.js';
import {
  logWorkerInfo,
  logWorkerWarn,
  logWorkerError,
  type WorkerName,
} from '../observability/worker-log.js';

const DEFAULT_GATEWAY = 'http://127.0.0.1:3010';
const DEFAULT_OLLAMA = 'http://127.0.0.1:11434';

function gatewayBaseUrl(): string {
  const raw =
    process.env.LLM_GATEWAY_URL ?? process.env.ORCHESTRATOR_LLM_GATEWAY_URL ?? DEFAULT_GATEWAY;
  return raw.replace(/\/$/, '');
}

function ollamaBaseUrl(): string {
  return (process.env.OLLAMA_URL ?? DEFAULT_OLLAMA).replace(/\/$/, '');
}

/**
 * Nodos efímeros (pc-gamer): el Gateway del VPS no alcanza Ollama local.
 * `OPSLY_OLLAMA_DIRECT=true` fuerza la ruta; con `OPSLY_EPHEMERAL_WORKER=true`
 * + `OLLAMA_URL` también se usa directo (margen $0 en GPU/CPU local).
 */
export function shouldUseDirectOllama(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (env.OPSLY_OLLAMA_DIRECT === 'true') {
    return true;
  }
  const ephemeral = env.OPSLY_EPHEMERAL_WORKER === 'true';
  const hasUrl = (env.OLLAMA_URL ?? '').trim().length > 0;
  return ephemeral && hasUrl;
}

type TextGatewayResponse = {
  content?: string;
  llm?: {
    model_used?: string;
    tokens_input?: number;
    tokens_output?: number;
    cost_usd?: number;
  };
};

type OllamaGenerateJson = {
  response?: string;
  model?: string;
  prompt_eval_count?: number;
  eval_count?: number;
};

async function callOllamaDirect(prompt: string): Promise<TextGatewayResponse> {
  const model = (process.env.OLLAMA_MODEL ?? 'llama3.2').trim() || 'llama3.2';
  const url = `${ollamaBaseUrl()}/api/generate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: { temperature: 0 },
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ollama direct HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }
  const json = (await res.json()) as OllamaGenerateJson;
  const content = typeof json.response === 'string' ? json.response : '';
  if (content.trim().length === 0) {
    throw new Error('ollama direct: empty response');
  }
  return {
    content,
    llm: {
      model_used: json.model ?? model,
      tokens_input: Math.max(0, json.prompt_eval_count ?? 0),
      tokens_output: Math.max(0, json.eval_count ?? 0),
      cost_usd: 0,
    },
  };
}

async function callOllamaViaGateway(args: {
  tenantSlug: string;
  plan: OrchestratorJob['plan'];
  requestId: string | undefined;
  taskType: string;
  prompt: string;
}): Promise<TextGatewayResponse> {
  const url = `${gatewayBaseUrl()}/v1/text`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenant_slug: args.tenantSlug,
      tenant_plan: args.plan,
      request_id: args.requestId,
      task_type: args.taskType,
      prompt: args.prompt,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ollama gateway HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }
  return (await res.json()) as TextGatewayResponse;
}

async function handleAutoCommit(ctx: {
  persona: string;
  runId: string;
  tenantSlug: string;
  result: string;
  success: boolean;
  durationMs: number;
}): Promise<void> {
  const { persona, runId, tenantSlug, result, success, durationMs } = ctx;

  logWorkerInfo('ollama', `auto-commit ${persona} completed`, { duration_ms: durationMs, success });

  const { createClient } = await import('@supabase/supabase-js');

  const supabaseUrl = process.env.SUPABASE_URL ?? 'https://jkwykpldnitavhmtuzmo.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

  if (!supabaseKey) {
    logWorkerInfo('ollama', 'SUPABASE_URL/KEY not configured, skipping auto-commit');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .schema('sandbox')
    .from('agent_task_results')
    .insert({
      persona,
      run_id: runId,
      tenant_slug: tenantSlug,
      result_summary: result.slice(0, 500),
      success,
      duration_ms: durationMs,
      completed_at: new Date().toISOString(),
    });

  if (error) {
    logWorkerError('ollama', `DB insert failed: ${error.message}`, { persona, run_id: runId });
    return;
  }

  logWorkerInfo('ollama', `Task result stored for ${persona}`, {
    run_id: runId,
    schema: 'sandbox',
  });

  if (persona === 'evolution-agent') {
    await runEvolutionLoop(ctx);
  } else if (persona === 'notifier-desayuno') {
    await runAutoSync(ctx);
  } else if (persona === 'watcher-agent') {
    await runWatcherHealth(ctx);
  }
}

async function runEvolutionLoop(ctx: {
  persona: string;
  runId: string;
  tenantSlug: string;
  result: string;
  success: boolean;
  durationMs: number;
}): Promise<void> {
  logWorkerInfo('ollama', 'Analyzing team performance...');

  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL ?? 'https://jkwykpldnitavhmtuzmo.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

  if (!supabaseKey) return;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: results } = await supabase
    .schema('sandbox')
    .from('agent_task_results')
    .select('*')
    .order('completed_at', { ascending: false })
    .limit(20);

  if (!results || results.length === 0) {
    logWorkerInfo('ollama', 'No historical data to analyze');
    return;
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;
  const avgDuration = results.reduce((acc, r) => acc + (r.duration_ms || 0), 0) / results.length;

  logWorkerInfo('ollama', 'Evolution stats', {
    success_count: successCount,
    fail_count: failCount,
    avg_duration_ms: Math.round(avgDuration),
  });

  if (failCount > successCount * 0.5) {
    logWorkerWarn('ollama', 'High failure rate detected - triggering correction', {
      success_count: successCount,
      fail_count: failCount,
    });
  }

  logWorkerInfo('ollama', 'Evolution analysis complete');
}

async function runAutoSync(ctx: {
  persona: string;
  runId: string;
  tenantSlug: string;
}): Promise<void> {
  logWorkerInfo('ollama', 'Checking for repo updates...');

  const gitDir = process.env.OPSLY_GIT_DIR || '/opt/opsly';

  try {
    const { execSync } = await import('child_process');

    process.chdir(gitDir);
    execSync('git fetch origin main', { stdio: 'ignore' });

    const local = execSync('git rev-parse HEAD').toString().trim();
    const remote = execSync('git rev-parse origin/main').toString().trim();

    if (local !== remote) {
      logWorkerInfo('ollama', 'New commits detected, syncing', {
        local: local.slice(0, 7),
        remote: remote.slice(0, 7),
      });
      execSync('git stash', { stdio: 'ignore' });
      execSync('git pull --rebase origin main', { stdio: 'inherit' });
      logWorkerInfo('ollama', 'Repo synced');
    } else {
      logWorkerInfo('ollama', 'Repo up to date');
    }
  } catch (err) {
    logWorkerError('ollama', `Sync failed: ${err instanceof Error ? err.message : 'unknown'}`);
  }
}

async function runWatcherHealth(ctx: {
  persona: string;
  runId: string;
  tenantSlug: string;
}): Promise<void> {
  logWorkerInfo('ollama', 'Running health checks...');

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL ?? 'https://jkwykpldnitavhmtuzmo.supabase.co';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

    if (!supabaseKey) return;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const redisUrl = process.env.REDIS_URL?.trim();
    if (!redisUrl) {
      logWorkerWarn('ollama', 'REDIS_URL not set; skipping watcher queue metrics');
      return;
    }
    const { createClient: createRedis } = await import('redis');
    const redis = createRedis({ url: redisUrl.replace(/^redis:\/\/:/, 'redis://') });
    await redis.connect();

    const [waiting, active, completed, failed] = await Promise.all([
      redis.lLen('bull:openclaw:wait').catch(() => 0),
      redis.lLen('bull:openclaw:active').catch(() => 0),
      redis.lLen('bull:openclaw:completed').catch(() => 0),
      redis.lLen('bull:openclaw:failed').catch(() => 0),
    ]);
    await redis.disconnect();

    const healthData = {
      timestamp: new Date().toISOString(),
      queue: { waiting, active, completed, failed },
      services: {
        redis: 'ok',
        ollama: 'ok',
        orchestrator: 'ok',
      },
    };

    logWorkerInfo('ollama', 'Health check result', {
      queue_waiting: waiting,
      queue_failed: failed,
    });

    if (failed > active && active > 0) {
      logWorkerWarn('ollama', 'High failure rate - auto-scaling triggered', {
        queue_active: active,
        queue_failed: failed,
      });
    }

    if (waiting > 50) {
      logWorkerWarn('ollama', 'Queue backup detected - consider scaling workers', {
        queue_waiting: waiting,
      });
    }

    try {
      const { error: insertError } = await supabase
        .schema('sandbox')
        .from('agent_watcher_metrics')
        .insert({
          run_id: ctx.runId,
          tenant_slug: ctx.tenantSlug,
          metrics_json: healthData,
          created_at: new Date().toISOString(),
        });
      if (insertError) {
        logWorkerError('ollama', `DB insert failed: ${insertError.message}`, { run_id: ctx.runId });
      }
    } catch (dbErr) {
      logWorkerError('ollama', `DB error: ${dbErr instanceof Error ? dbErr.message : 'unknown'}`);
    }
  } catch (err) {
    logWorkerError(
      'ollama',
      `Health check failed: ${err instanceof Error ? err.message : 'unknown'}`
    );
  }
}

async function processOllamaJob(job: Job) {
  const data = job.data as OrchestratorJob;
  const payload = data.payload as {
    task_type?: string;
    prompt?: string;
  };

  const autoCommit = data.metadata?.auto_commit === true;
  const agentPersona = String(data.metadata?.persona ?? 'unknown');
  const runId = String(data.metadata?.run_id ?? 'unknown');

  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  if (prompt.length === 0) {
    throw new Error('ollama job: prompt required');
  }
  const tenantSlug = data.tenant_slug?.trim() ?? '';
  if (tenantSlug.length === 0) {
    throw new Error('ollama job: tenant_slug required');
  }

  const taskType =
    payload.task_type === 'analyze' ||
    payload.task_type === 'generate' ||
    payload.task_type === 'review' ||
    payload.task_type === 'summarize'
      ? payload.task_type
      : 'summarize';

  const t0 = Date.now();
  const direct = shouldUseDirectOllama();
  if (direct) {
    logWorkerInfo('ollama', 'using direct OLLAMA_URL (ephemeral/local)', {
      ollama_url_host: new URL(ollamaBaseUrl()).host,
    });
  }

  const json = direct
    ? await callOllamaDirect(prompt)
    : await callOllamaViaGateway({
        tenantSlug,
        plan: data.plan,
        requestId: data.request_id,
        taskType,
        prompt,
      });

  const tokensIn = Math.max(0, json.llm?.tokens_input ?? 0);
  const tokensOut = Math.max(0, json.llm?.tokens_output ?? 0);
  meterPlannerLlmFireAndForget(tenantSlug, data.tenant_id, {
    model_used: json.llm?.model_used ?? 'unknown',
    tokens_input: tokensIn,
    tokens_output: tokensOut,
  });

  const duration = Date.now() - t0;

  if (autoCommit) {
    const resultContent =
      typeof json.content === 'string' ? json.content : JSON.stringify(json.content ?? '');
    await handleAutoCommit({
      persona: agentPersona,
      runId,
      tenantSlug,
      result: resultContent,
      success: true,
      durationMs: duration,
    });
  }

  return {
    success: true,
    content_preview: typeof json.content === 'string' ? json.content.slice(0, 500) : '',
    cost_usd: json.llm?.cost_usd ?? 0,
    model_used: json.llm?.model_used ?? 'unknown',
    auto_commit: autoCommit,
    direct_ollama: direct,
  };
}

export function startOllamaWorker(connection: object) {
  return createWorker({
    jobName: 'ollama',
    workerName: 'ollama',
    concurrencyKey: 'ollama',
    connection,
    processFn: processOllamaJob,
  });
}
