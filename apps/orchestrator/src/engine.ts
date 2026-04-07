import { enqueueJob } from "./queue.js";
import { setJobState } from "./state/store.js";
import type { IntentRequest, OrchestratorJob } from "./types.js";

export async function processIntent(req: IntentRequest) {
  const jobs: OrchestratorJob[] = [];

  switch (req.intent) {
    case "execute_code":
      jobs.push({
        type: "cursor",
        payload: req.context,
        tenant_slug: req.tenant_slug,
        initiated_by: req.initiated_by
      });
      break;
    case "trigger_workflow":
      jobs.push({
        type: "n8n",
        payload: req.context,
        tenant_slug: req.tenant_slug,
        initiated_by: req.initiated_by
      });
      break;
    case "notify":
      jobs.push({
        type: "notify",
        payload: req.context,
        initiated_by: req.initiated_by
      });
      break;
    case "sync_drive":
      jobs.push({
        type: "drive",
        payload: {},
        initiated_by: req.initiated_by
      });
      break;
    case "full_pipeline":
      jobs.push(
        {
          type: "cursor",
          payload: req.context,
          tenant_slug: req.tenant_slug,
          initiated_by: req.initiated_by
        },
        {
          type: "notify",
          payload: { message: "Pipeline iniciado" },
          initiated_by: req.initiated_by
        },
        {
          type: "drive",
          payload: {},
          initiated_by: req.initiated_by
        }
      );
      break;
  }

  const enqueued = await Promise.all(jobs.map((job) => enqueueJob(job)));
  await Promise.all(
    enqueued.map(async (job, index) => {
      const queuedJob = jobs[index];
      await setJobState(String(job.id), {
        id: String(job.id),
        type: queuedJob.type,
        status: "pending",
        tenant_slug: queuedJob.tenant_slug,
        started_at: new Date().toISOString(),
      });
    }),
  );
  return {
    jobs_enqueued: enqueued.length,
    job_ids: enqueued.map((job) => job.id),
    intent: req.intent
  };
}
