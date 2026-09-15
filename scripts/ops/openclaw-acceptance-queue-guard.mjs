#!/usr/bin/env node
import { Queue } from 'bullmq';

const kind = process.argv[2] || 'local_openclaw';
const raw = process.env.REDIS_URL || '';
if (!raw) {
  console.error('BLOCKED: REDIS_URL is required');
  process.exit(3);
}

const url = new URL(raw);
const queue = new Queue('local-agents', {
  connection: {
    host: url.hostname,
    port: Number(url.port || '6379'),
    password: process.env.REDIS_PASSWORD || (url.password ? decodeURIComponent(url.password) : undefined),
  },
});

try {
  const jobs = await queue.getJobs(
    ['waiting', 'active', 'delayed', 'prioritized', 'waiting-children'],
    0,
    200,
    true
  );
  const matches = jobs
    .filter((job) => job.name === kind)
    .map((job) => ({ id: job.id == null ? null : String(job.id), name: job.name }));

  if (matches.length > 0) {
    console.error(
      JSON.stringify({
        marker: 'OPENCLAW_ACCEPTANCE_QUEUE_BLOCKED',
        kind,
        count: matches.length,
        jobs: matches,
      })
    );
    process.exitCode = 3;
  } else {
    console.log('OPENCLAW_ACCEPTANCE_QUEUE_CLEAN');
  }
} finally {
  await queue.close();
}
