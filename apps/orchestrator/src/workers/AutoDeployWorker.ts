import { Job, Worker } from "bullmq";
import { logWorkerLifecycle } from "../observability/worker-log.js";
import { notifyDiscord } from "./NotifyWorker.js";

export interface AutoDeployPayload {
  commit_sha: string;
  branch: string;
  triggered_by?: string;
}

const VPS_SSH = process.env.VPS_TAILSCALE_HOST ?? "vps-dragon@100.120.151.91";
const OPSLY_ROOT = process.env.VPS_OPSLY_ROOT ?? "/opt/opsly";
const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN ?? "ops.smiletripcare.com";
const HEALTH_TIMEOUT_MS = 60_000;

async function runSSH(cmd: string): Promise<{ ok: boolean; output: string }> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const execFileAsync = promisify(execFile);
  try {
    const { stdout, stderr } = await execFileAsync("ssh", [
      "-o", "StrictHostKeyChecking=accept-new",
      "-o", "BatchMode=yes",
      "-o", "ConnectTimeout=15",
      VPS_SSH,
      cmd,
    ], { timeout: 120_000 });
    return { ok: true, output: stdout + stderr };
  } catch (err) {
    return { ok: false, output: err instanceof Error ? err.message : String(err) };
  }
}

async function healthCheck(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
    return res.ok;
  } catch {
    return false;
  }
}

export function startAutoDeployWorker(connection: object): Worker {
  return new Worker<AutoDeployPayload>(
    "openclaw",
    async (job: Job<AutoDeployPayload>) => {
      if (job.name !== "auto-deploy") return;

      const t0 = Date.now();
      logWorkerLifecycle("start", "auto-deploy", job);

      const { commit_sha, branch, triggered_by } = job.data;

      // Solo desplegar desde main
      if (branch !== "main" && branch !== "refs/heads/main") {
        logWorkerLifecycle("complete", "auto-deploy", job, { skipped: true, branch });
        return { skipped: true, reason: "not main branch" };
      }

      await notifyDiscord(
        "🚀 Auto-Deploy iniciado",
        `Commit: ${commit_sha.slice(0, 8)}\nBranch: ${branch}\nTriggered by: ${triggered_by ?? "CI"}`,
        "info"
      );

      // 1. Pull + rebuild en VPS
      const deployScript = [
        `set -euo pipefail`,
        `cd ${OPSLY_ROOT}`,
        `git fetch origin`,
        `git reset --hard origin/main`,
        `npm ci --workspace=apps/api --workspace=apps/admin 2>&1 | tail -5`,
        `docker compose -f infra/docker-compose.platform.yml up -d --build app 2>&1 | tail -10`,
      ].join(" && ");
      const deployCmd = `bash -lc ${JSON.stringify(deployScript)}`;

      const deployResult = await runSSH(deployCmd);

      if (!deployResult.ok) {
        await notifyDiscord(
          "🚨 Deploy falló en VPS",
          `Commit: ${commit_sha.slice(0, 8)}\nError: ${deployResult.output.slice(0, 300)}`,
          "error"
        );
        logWorkerLifecycle("fail", "auto-deploy", job, { duration_ms: Date.now() - t0 });
        throw new Error(`Deploy SSH failed: ${deployResult.output}`);
      }

      // 2. Esperar 30s para que el container arranque
      await new Promise(resolve => setTimeout(resolve, 30_000));

      // 3. Health check
      const healthy = await healthCheck(`https://api.${PLATFORM_DOMAIN}/api/health`);

      if (!healthy) {
        await notifyDiscord(
          "🚨 Deploy: health check falló",
          `Commit: ${commit_sha.slice(0, 8)}\nAPI no responde. Rollback manual requerido.`,
          "error"
        );
        logWorkerLifecycle("fail", "auto-deploy", job, { duration_ms: Date.now() - t0 });
        throw new Error("Health check failed after deploy");
      }

      await notifyDiscord(
        "✅ Deploy exitoso",
        `Commit: ${commit_sha.slice(0, 8)}\nhttps://api.${PLATFORM_DOMAIN}/api/health ✓`,
        "success"
      );

      logWorkerLifecycle("complete", "auto-deploy", job, {
        duration_ms: Date.now() - t0,
        commit_sha,
      });

      return { success: true, commit_sha, healthy: true };
    },
    { connection, concurrency: 1 } // deploy secuencial — nunca en paralelo
  );
}
