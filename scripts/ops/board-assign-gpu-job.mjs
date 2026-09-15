#!/usr/bin/env node
// AI Board / Mission Control helper: assign a GPU job by capability.
// Default is dry-run. --apply enqueues on the existing BullMQ queue.
// Offline workers still enqueue so the job waits. No second queue.

import { randomUUID } from 'node:crypto';
import { assignJob, loadRegistry } from './compute-worker-router.mjs';

function readFlag(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  return argv[index + 1];
}

function hasFlag(argv, name) {
  return argv.includes(name);
}

function redisConnection(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    maxRetriesPerRequest: null,
  };
}

async function enqueueAssignment(assignment, options) {
  const { Queue } = await import('bullmq');
  const queue = new Queue(assignment.queue, { connection: redisConnection(options.redisUrl) });
  const requestId = randomUUID();
  const tenantSlug = options.tenantSlug;
  const jobId = `board:${assignment.jobType}:${requestId}`;
  let payload;
  if (assignment.jobType === 'ai.local.inference' || assignment.jobType === 'test.gpu') {
    payload = {
      type: 'ollama',
      tenant_slug: tenantSlug,
      request_id: requestId,
      initiated_by: 'ai-board',
      payload: {
        task_type: 'summarize',
        prompt: options.prompt,
      },
    };
  } else {
    payload = {
      tenant_slug: tenantSlug,
      request_id: requestId,
      draft_id: `board-${requestId.slice(0, 8)}`,
      draft: {
        id: `board-${requestId.slice(0, 8)}`,
        tenant_slug: tenantSlug,
        title: options.title,
        state: 'approved',
        reel_script: [{ duration_sec: 5, copy: options.title }],
        compliance_flags: ['not_peskids', 'no_customer_pii'],
      },
      preset: { slug: 'board-gpu-smoke', aspect_ratio: '9:16' },
    };
  }
  const job = await queue.add(assignment.jobName, payload, {
    jobId,
    removeOnComplete: 50,
    removeOnFail: 50,
  });
  await queue.close();
  return { jobId: job.id, requestId };
}

async function main(argv) {
  const apply = hasFlag(argv, '--apply');
  const jobType = readFlag(argv, '--job') || 'content.render.video';
  const tenantSlug = readFlag(argv, '--tenant') || 'intcloudsysops';
  const prompt =
    readFlag(argv, '--prompt') ||
    'Reply with OK and the local model name. Do not include personal data or secrets.';
  const title = readFlag(argv, '--title') || 'Opsly GPU worker smoke';
  const registry = loadRegistry();
  const assignment = assignJob(registry, jobType);
  const result = {
    dryRun: !apply,
    assignment,
    tenantSlug,
  };
  if (!assignment.ok) {
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 2;
    return;
  }
  if (!apply) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    throw new Error('REDIS_URL is required for --apply (VPS Redis over Tailscale).');
  }
  const enqueued = await enqueueAssignment(assignment, { redisUrl, tenantSlug, prompt, title });
  console.log(JSON.stringify({ ...result, enqueued }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
