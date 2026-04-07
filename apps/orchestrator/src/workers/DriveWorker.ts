import { Job, Worker } from "bullmq";
import { execa } from "execa";

export function startDriveWorker(connection: object) {
  return new Worker(
    "openclaw",
    async (job: Job) => {
      if (job.name !== "drive") {
        return;
      }
      await execa("bash", ["./scripts/drive-sync.sh"], {
        cwd: process.cwd(),
      });
      return { success: true };
    },
    { connection, concurrency: 2 },
  );
}
