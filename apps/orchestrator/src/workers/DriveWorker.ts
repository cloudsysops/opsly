import { Job, Worker } from "bullmq";
import { execa } from "execa";
import { logWorkerLifecycle } from "../observability/worker-log.js";

export function startDriveWorker(connection: object) {
  return new Worker(
    "openclaw",
    async (job: Job) => {
      if (job.name !== "drive") {
        return;
      }
      const t0 = Date.now();
      logWorkerLifecycle("start", "drive", job);
      try {
        await execa("bash", ["./scripts/drive-sync.sh"], {
          cwd: process.cwd(),
        });
        logWorkerLifecycle("complete", "drive", job, { duration_ms: Date.now() - t0 });
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWorkerLifecycle("fail", "drive", job, {
          duration_ms: Date.now() - t0,
          error: msg,
        });
        throw err;
      }
    },
    { connection, concurrency: 2 },
  );
}
