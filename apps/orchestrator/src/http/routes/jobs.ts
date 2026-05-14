import type { RouteContext } from '../router.js';
import { orchestratorQueue } from '../../queue.js';
import { verifyPlatformAdminToken, parseBody } from '../utils.js';
import { jsonResponse, errorResponse } from '../router.js';

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
    const j = await orchestratorQueue.getJob(jobId);
    if (!j) {
      errorResponse(ctx.res, 404, 'not found');
      return;
    }
    const state = await j.getState();
    jsonResponse(ctx.res, 200, {
      job_id: j.id != null ? String(j.id) : null,
      name: j.name,
      state,
      returnvalue: j.returnvalue,
      failedReason: j.failedReason,
    });
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
    const j = await orchestratorQueue.getJob(jobId);
    if (!j) {
      errorResponse(ctx.res, 404, 'not found');
      return;
    }
    const state = await j.getState();
    jsonResponse(ctx.res, 200, {
      success: true,
      job_id: j.id != null ? String(j.id) : null,
      name: j.name,
      state,
      progress: j.progress,
      returnvalue: j.returnvalue,
      failedReason: j.failedReason,
      timestamp: j.timestamp,
    });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

export async function handleJobStatusAlias(ctx: RouteContext): Promise<void> {
  const jobId = ctx.params['jobId'] ?? '';
  ctx.params['jobId'] = jobId;
  await handleJobById(ctx);
}
