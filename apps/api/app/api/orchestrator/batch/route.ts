import { NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import { jsonError, parseJsonBody } from '../../../../lib/api-response.js';
import { requireAdminAccess } from '../../../../lib/auth.js';
import { getBullmqRedisConnection } from '../../../../lib/bullmq-redis.js';
import { buildBatchId, validateBatchSize } from '../../../../lib/batch.js';
import { HTTP_STATUS } from '../../../../lib/constants.js';

export const dynamic = 'force-dynamic';

interface BatchJob {
  type: string;
  tenant_slug: string;
  initiated_by: 'claude' | 'discord' | 'cron' | 'system';
  plan?: 'startup' | 'business' | 'enterprise';
  idempotency_key?: string;
  request_id?: string;
  payload?: Record<string, unknown>;
}

const PRIORITY_ENTERPRISE = 0;
const PRIORITY_BUSINESS = 10_000;
const PRIORITY_DEFAULT = 50_000;
const JOB_ATTEMPTS = 3;
const JOB_BACKOFF_DELAY_MS = 2_000;

function planPriority(plan?: string): number {
  if (plan === 'enterprise') return PRIORITY_ENTERPRISE;
  if (plan === 'business') return PRIORITY_BUSINESS;
  return PRIORITY_DEFAULT;
}

function jobOpts(job: BatchJob): object {
  return {
    jobId: job.idempotency_key || job.request_id,
    priority: planPriority(job.plan),
    attempts: JOB_ATTEMPTS,
    backoff: { type: 'exponential', delay: JOB_BACKOFF_DELAY_MS },
  };
}

type RequestValidation =
  | { ok: false; response: Response }
  | { ok: true; jobs: BatchJob[]; batch_id?: string };

function validateRequest(parsed: Awaited<ReturnType<typeof parseJsonBody>>): RequestValidation {
  if (!parsed.ok) return { ok: false, response: parsed.response };
  const body = parsed.body as { jobs?: BatchJob[]; batch_id?: string };
  if (!body.jobs || !Array.isArray(body.jobs) || body.jobs.length === 0) {
    return {
      ok: false,
      response: jsonError('jobs must be a non-empty array', HTTP_STATUS.BAD_REQUEST),
    };
  }
  const sizeCheck = validateBatchSize(body.jobs.length);
  if (!sizeCheck.valid) {
    return {
      ok: false,
      response: jsonError(sizeCheck.message ?? 'invalid batch size', HTTP_STATUS.BAD_REQUEST),
    };
  }
  return { ok: true, jobs: body.jobs, batch_id: body.batch_id };
}

async function doBulkEnqueue(
  jobs: BatchJob[],
  batchId: string,
  redis: NonNullable<ReturnType<typeof getBullmqRedisConnection>>
): Promise<{
  batch_id: string;
  enqueued: number;
  jobs: { id: string | number | undefined; type: string | undefined }[];
}> {
  const queue = new Queue('openclaw', { connection: redis });
  const bullJobs = await queue.addBulk(
    jobs.map((job) => ({ name: job.type, data: job, opts: jobOpts(job) }))
  );
  await queue.close();
  return {
    batch_id: batchId,
    enqueued: bullJobs.length,
    jobs: bullJobs.map((j) => ({ id: j.id, type: j.name })),
  };
}

export async function POST(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) return authError;

  const parsed = await parseJsonBody(request);
  const validation = validateRequest(parsed);
  if (!validation.ok) return validation.response;

  const redis = getBullmqRedisConnection();
  if (!redis) return jsonError('Redis not available', HTTP_STATUS.SERVICE_UNAVAILABLE);

  try {
    return NextResponse.json(
      await doBulkEnqueue(validation.jobs, validation.batch_id || buildBatchId('batch'), redis)
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/orchestrator/batch]', msg);
    return jsonError(msg, HTTP_STATUS.INTERNAL_ERROR);
  }
}
