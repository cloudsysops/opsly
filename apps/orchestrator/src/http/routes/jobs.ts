import type { Job } from 'bullmq';
import type { RouteContext } from '../router.js';
import { localAgentQueue, orchestratorQueue } from '../../queue.js';
import { verifyPlatformAdminToken } from '../utils.js';
import { jsonResponse, errorResponse } from '../router.js';
import { findJobAcrossQueues, type JobLookupQueue } from '../job-lookup.js';

/** Queues that accept agent / orchestrator work visible to status APIs. */
const JOB_STATUS_QUEUES: JobLookupQueue[] = [
  { name: 'openclaw', getJob: (id) => orchestratorQueue.getJob(id) },
  { name: 'local-agents', getJob: (id) => localAgentQueue.getJob(id) },
];

function jobStatusPayload(job: Job, state: string, queue: string): Record<string, unknown> {
  return {
    success: true,
    job_id: job.id != null ? String(job.id) : null,
    name: job.name,
    queue,
    /** BullMQ state (waiting|active|completed|failed|…). */
    state,
    /** Alias for watchers that read `status` first. */
    status: state,
    progress: job.progress,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    timestamp: job.timestamp,
  };
}

export async function handleOpenclawJobStatus(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }
  const jobId = ctx.query['job_id']?.trim() ?? '';
  if (jobId.length === 0) {
    errorResponse(ctx.res, 400, 'job_id required');
    return;
  }
  try {
    const found = await findJobAcrossQueues(jobId, JOB_STATUS_QUEUES);
    if (!found) {
      errorResponse(ctx.res, 404, 'not found');
      return;
    }
    const state = await found.job.getState();
    jsonResponse(ctx.res, 200, jobStatusPayload(found.job, state, found.queue));
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

export async function handleJobById(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }
  const jobId = ctx.params['jobId']?.trim() ?? '';
  if (jobId.length === 0) {
    errorResponse(ctx.res, 400, 'job id required');
    return;
  }
  try {
    const found = await findJobAcrossQueues(jobId, JOB_STATUS_QUEUES);
    if (!found) {
      errorResponse(ctx.res, 404, 'not found');
      return;
    }
    const state = await found.job.getState();
    jsonResponse(ctx.res, 200, jobStatusPayload(found.job, state, found.queue));
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

export async function handleJobStatusAlias(ctx: RouteContext): Promise<void> {
  const jobId = ctx.params['jobId'] ?? '';
  ctx.params['jobId'] = jobId;
  await handleJobById(ctx);
}
