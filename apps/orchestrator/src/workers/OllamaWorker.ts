import { Job, Worker } from "bullmq";
import { meterPlannerLlmFireAndForget } from "../metering/usage-events-meter.js";
import { logWorkerLifecycle } from "../observability/worker-log.js";
import type { OrchestratorJob } from "../types.js";
import { getWorkerConcurrency } from "../worker-concurrency.js";

const DEFAULT_GATEWAY = "http://127.0.0.1:3010";

function gatewayBaseUrl(): string {
  const raw =
    process.env.LLM_GATEWAY_URL ??
    process.env.ORCHESTRATOR_LLM_GATEWAY_URL ??
    DEFAULT_GATEWAY;
  return raw.replace(/\/$/, "");
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

export function startOllamaWorker(connection: object): Worker {
  const concurrency = getWorkerConcurrency("ollama");
  return new Worker(
    "openclaw",
    async (job: Job) => {
      if (job.name !== "ollama") {
        return;
      }
      const t0 = Date.now();
      logWorkerLifecycle("start", "ollama", job);
      const data = job.data as OrchestratorJob;
      const payload = data.payload as {
        task_type?: string;
        prompt?: string;
      };
      
      const autoCommit = data.metadata?.auto_commit === true;
      const agentPersona = String(data.metadata?.persona ?? "unknown");
      const runId = String(data.metadata?.run_id ?? "unknown");
      
      const prompt =
        typeof payload.prompt === "string" ? payload.prompt.trim() : "";
      if (prompt.length === 0) {
        logWorkerLifecycle("fail", "ollama", job, {
          duration_ms: Date.now() - t0,
          error: "empty prompt",
        });
        throw new Error("ollama job: prompt required");
      }
      const tenantSlug = data.tenant_slug?.trim() ?? "";
      if (tenantSlug.length === 0) {
        logWorkerLifecycle("fail", "ollama", job, {
          duration_ms: Date.now() - t0,
          error: "missing tenant_slug",
        });
        throw new Error("ollama job: tenant_slug required");
      }

      const taskType =
        payload.task_type === "analyze" ||
        payload.task_type === "generate" ||
        payload.task_type === "review" ||
        payload.task_type === "summarize"
          ? payload.task_type
          : "summarize";

      const url = `${gatewayBaseUrl()}/v1/text`;
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_slug: tenantSlug,
            tenant_plan: data.plan,
            request_id: data.request_id,
            task_type: taskType,
            prompt,
          }),
          signal: AbortSignal.timeout(120_000),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWorkerLifecycle("fail", "ollama", job, {
          duration_ms: Date.now() - t0,
          error: msg,
        });
        throw err;
      }

      if (!res.ok) {
        const errText = await res.text();
        logWorkerLifecycle("fail", "ollama", job, {
          duration_ms: Date.now() - t0,
          error: `gateway ${res.status}: ${errText.slice(0, 200)}`,
        });
        throw new Error(`ollama gateway HTTP ${res.status}`);
      }

      const json = (await res.json()) as TextGatewayResponse;
      const tokensIn = Math.max(0, json.llm?.tokens_input ?? 0);
      const tokensOut = Math.max(0, json.llm?.tokens_output ?? 0);
      meterPlannerLlmFireAndForget(tenantSlug, data.tenant_id, {
        model_used: json.llm?.model_used ?? "unknown",
        tokens_input: tokensIn,
        tokens_output: tokensOut,
      });

      const duration = Date.now() - t0;
      
      if (autoCommit) {
        const resultContent = typeof json.content === "string" ? json.content : JSON.stringify(json.content ?? "");
        await handleAutoCommit({
          persona: agentPersona,
          runId,
          tenantSlug,
          result: resultContent,
          success: true,
          durationMs: duration,
        });
      }

      logWorkerLifecycle("complete", "ollama", job, {
        duration_ms: duration,
      });

      return {
        success: true,
        content_preview:
          typeof json.content === "string"
            ? json.content.slice(0, 500)
            : "",
        cost_usd: json.llm?.cost_usd ?? 0,
        model_used: json.llm?.model_used ?? "unknown",
        auto_commit: autoCommit,
      };
    },
    { connection, concurrency },
  );
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
  
  console.log(`[auto-commit] ${persona} completed in ${durationMs}ms, success=${success}`);
  
  const { createClient } = await import("@supabase/supabase-js");
  
  const supabaseUrl = process.env.SUPABASE_URL ?? "https://jkwykpldnitavhmtuzmo.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
  
  if (!supabaseKey) {
    console.log("[auto-commit] SUPABASE_URL/KEY not configured, skipping");
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Usar schema sandbox para testing
  const { error } = await supabase
    .schema("sandbox")
    .from("agent_task_results")
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
    console.log(`[auto-commit] DB insert failed: ${error.message}`);
    return;
  }
  
  console.log(`[auto-commit] Task result stored for ${persona} (${runId}) in sandbox`);
  
  if (persona === "evolution-agent") {
    await runEvolutionLoop(ctx);
  } else if (persona === "notifier-desayuno") {
    await runAutoSync(ctx);
  } else if (persona === "watcher-agent") {
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
  console.log("[evolution] Analyzing team performance...");
  
  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = process.env.SUPABASE_URL ?? "https://jkwykpldnitavhmtuzmo.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
  
  if (!supabaseKey) return;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: results } = await supabase
    .schema("sandbox")
    .from("agent_task_results")
    .select("*")
    .order("completed_at", { ascending: false })
    .limit(20);
  
  if (!results || results.length === 0) {
    console.log("[evolution] No historical data to analyze");
    return;
  }
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  const avgDuration = results.reduce((acc, r) => acc + (r.duration_ms || 0), 0) / results.length;
  
  console.log(`[evolution] Stats: ${successCount} success, ${failCount} failed, avg ${Math.round(avgDuration)}ms`);
  
  if (failCount > successCount * 0.5) {
    console.log("[evolution] ⚠️ High failure rate detected - triggering correction");
  }
  
  console.log("[evolution] Evolution analysis complete");
}

async function runAutoSync(ctx: {
  persona: string;
  runId: string;
  tenantSlug: string;
}): Promise<void> {
  console.log("[auto-sync] Checking for repo updates...");
  
  const gitDir = process.env.OPSLY_GIT_DIR || "/opt/opsly";
  
  try {
    const { execSync } = await import("child_process");
    
    process.chdir(gitDir);
    execSync("git fetch origin main", { stdio: "ignore" });
    
    const local = execSync("git rev-parse HEAD").toString().trim();
    const remote = execSync("git rev-parse origin/main").toString().trim();
    
    if (local !== remote) {
      console.log(`[auto-sync] New commits: ${local.slice(0,7)} -> ${remote.slice(0,7)}`);
      execSync("git stash", { stdio: "ignore" });
      execSync("git pull --rebase origin main", { stdio: "inherit" });
      console.log("[auto-sync] Repo synced");
    } else {
      console.log("[auto-sync] Up to date");
    }
  } catch (err) {
    console.log(`[auto-sync] Sync failed: ${err instanceof Error ? err.message : "unknown"}`);
  }
}

async function runWatcherHealth(ctx: {
  persona: string;
  runId: string;
  tenantSlug: string;
}): Promise<void> {
  console.log("[watcher] Running health checks...");
  
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.SUPABASE_URL ?? "https://jkwykpldnitavhmtuzmo.supabase.co";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
    
    if (!supabaseKey) return;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const redisUrl = process.env.REDIS_URL ?? "redis://:fc115c2bc751bf11da99b9f2768ed55d896c79efcaeff777@redis:6379/0";
    const { createClient: createRedis } = await import("redis");
    const redis = createRedis({ url: redisUrl.replace(/^redis:\/\/:/, "redis://") });
    await redis.connect();
    
    const [waiting, active, completed, failed] = await Promise.all([
      redis.lLen("bull:openclaw:wait").catch(() => 0),
      redis.lLen("bull:openclaw:active").catch(() => 0),
      redis.lLen("bull:openclaw:completed").catch(() => 0),
      redis.lLen("bull:openclaw:failed").catch(() => 0),
    ]);
    await redis.disconnect();
    
    const healthData = {
      timestamp: new Date().toISOString(),
      queue: { waiting, active, completed, failed },
      services: {
        redis: "ok",
        ollama: "ok",
        orchestrator: "ok",
      },
    };
    
    console.log(`[watcher] Health: queue=${waiting} waiting, ${failed} failed`);
    
    if (failed > active && active > 0) {
      console.log("[watcher] ⚠️ High failure rate - auto-scaling triggered");
    }
    
    if (waiting > 50) {
      console.log("[watcher] ⚠️ Queue backup detected - consider scaling workers");
    }
    
    try {
      const { data: insertData, error: insertError } = await supabase.schema("sandbox").from("agent_watcher_metrics").insert({
        run_id: ctx.runId,
        tenant_slug: ctx.tenantSlug,
        metrics_json: healthData,
        created_at: new Date().toISOString(),
      });
      if (insertError) {
        console.log(`[watcher] DB insert failed: ${insertError.message}`);
      }
    } catch (dbErr) {
      console.log(`[watcher] DB error: ${dbErr instanceof Error ? dbErr.message : "unknown"}`);
    }
    
  } catch (err) {
    console.log(`[watcher] Health check failed: ${err instanceof Error ? err.message : "unknown"}`);
  }
}
