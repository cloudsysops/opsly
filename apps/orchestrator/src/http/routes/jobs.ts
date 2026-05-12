import type { IncomingMessage, ServerResponse } from 'node:http';
import { jsonResponse, errorResponse } from '../router.js';
import { verifyPlatformAdminToken } from '../utils.js';
import { orchestratorQueue } from '../../queue.js';

export async function handleOpenclawJobStatus(
  req: IncomingMessage,
  res: ServerResponse,
  query: string
): Promise<void> {
  if (!verifyPlatformAdminToken(req)) {
    return errorResponse(res, 'unauthorized', 401);
  }
  const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);
  const jobId = params.get('job_id')?.trim() ?? '';
  if (!jobId) {
    return errorResponse(res, 'job_id required', 400);
  }
  const j = await orchestratorQueue.getJob(jobId);
  if (!j) {
    return errorResponse(res, 'not found', 404);
  }
  const state = await j.getState();
  const progress = j.progress;
  return jsonResponse(res, {
    job_id: j.id != null ? String(j.id) : null,
    name: j.name,
    state,
    progress,
    data: j.data,
    returnvalue: j.returnvalue,
  });
}

export async function handleJobById(
  req: IncomingMessage,
  res: ServerResponse,
  jobId: string
): Promise<void> {
  const prefix = '/internal/job/';
  const id = jobId.startsWith(prefix) ? jobId.slice(prefix.length) : jobId;
  const j = await orchestratorQueue.getJob(id);
  if (!j) {
    return errorResponse(res, 'not found', 404);
  }
  const state = await j.getState();
  return jsonResponse(res, {
    job_id: j.id != null ? String(j.id) : null,
    name: j.name,
    state,
    progress: j.progress,
    data: j.data,
    returnvalue: j.returnvalue,
  });
}