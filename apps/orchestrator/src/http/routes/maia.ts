import type { RouteContext } from '../router.js';
import { parseBody } from '../utils.js';
import { orchestratorQueue } from '../../queue.js';
import { jsonResponse, errorResponse } from '../router.js';

/**
 * POST /api/maia/callback
 * Called by GitHub Actions (or n8n) after a maia/* branch push.
 * Enqueues a "validate" job so ValidationWorker polls CI results.
 */
export async function handleMaiaCallback(ctx: RouteContext): Promise<void> {
  let body: unknown;
  try {
    body = await parseBody(ctx.req);
  } catch {
    errorResponse(ctx.res, 400, 'Invalid JSON');
    return;
  }
  const b = body as Record<string, unknown>;
  const jobId = typeof b.job_id === 'string' ? b.job_id.trim() : '';
  const commitSha = typeof b.commit_sha === 'string' ? b.commit_sha.trim() : '';
  const branch = typeof b.branch === 'string' ? b.branch : '';
  const pusher = typeof b.pusher === 'string' ? b.pusher : 'maia';

  if (!jobId || !commitSha) {
    errorResponse(ctx.res, 400, 'job_id and commit_sha required');
    return;
  }

  const REPO = process.env.OPSLY_GITHUB_REPO ?? 'cloudsysops/opsly';
  try {
    await orchestratorQueue.add('validate', {
      task_id: jobId,
      agent: 'dev',
      commit_sha: commitSha,
      pr_url: `https://github.com/${REPO}/tree/${branch}`,
      retry_count: 0,
    });
    jsonResponse(ctx.res, 200, { received: true, job_id: jobId, queued: 'validate', pusher });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

/**
 * POST /api/maia/self-heal
 * Triggers a self-heal action for a given service.
 * Called by n8n eyes-self-heal workflow.
 */
export async function handleMaiaSelfHeal(ctx: RouteContext): Promise<void> {
  let body: unknown;
  try {
    body = await parseBody(ctx.req);
  } catch {
    errorResponse(ctx.res, 400, 'Invalid JSON');
    return;
  }
  const b = body as Record<string, unknown>;
  const tenantSlug = typeof b.tenant_slug === 'string' ? b.tenant_slug : 'platform';
  const service = typeof b.service === 'string' ? b.service : 'app';
  const action =
    b.action === 'restart' || b.action === 'refresh-env' || b.action === 'full-restart'
      ? b.action
      : 'restart';
  const reason = typeof b.reason === 'string' ? b.reason : 'manual_trigger';

  try {
    const job = await orchestratorQueue.add('self-heal', {
      tenant_slug: tenantSlug,
      service,
      action,
      reason,
    });
    jsonResponse(ctx.res, 202, { ok: true, job_id: job.id ?? null });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}
