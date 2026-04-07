import { Job, Worker } from "bullmq";

export function startN8nWorker(connection: object) {
  return new Worker(
    "openclaw",
    async (job: Job) => {
      if (job.name !== "n8n") {
        return;
      }
      const webhookUrl = process.env.N8N_WEBHOOK_URL || "";
      if (!webhookUrl) {
        throw new Error("N8N_WEBHOOK_URL is required");
      }

      const payload = job.data.payload as Record<string, unknown>;
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`N8n webhook failed with status ${response.status}`);
      }

      return { success: true };
    },
    { connection, concurrency: 5 },
  );
}
