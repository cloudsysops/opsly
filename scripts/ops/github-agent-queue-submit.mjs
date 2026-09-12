#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error('workpack must start with YAML frontmatter');
  const meta = {};
  for (const raw of match[1].split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    if (/^(true|false)$/i.test(value)) value = value.toLowerCase() === 'true';
    else if (/^-?\d+(\.\d+)?$/.test(value)) value = Number(value);
    meta[key] = value;
  }
  return { meta, body: match[2].trim() };
}

function requireField(meta, key) {
  if (meta[key] === undefined || meta[key] === null || meta[key] === '') {
    throw new Error(`missing required frontmatter field: ${key}`);
  }
}

function assertSafe(meta) {
  for (const key of ['id','status','priority','agent','owner','environment','cost_class','estimated_cost_usd']) {
    requireField(meta, key);
  }

  if (meta.agent !== 'local_opencode') {
    throw new Error('GitHub Agent Queue currently permits only agent=local_opencode');
  }
  if (!['pending','ready'].includes(String(meta.status))) {
    throw new Error('status must be pending or ready');
  }
  if (!['free','free_with_quota'].includes(String(meta.cost_class))) {
    throw new Error('cost_class must be free or free_with_quota');
  }
  if (Number(meta.estimated_cost_usd) !== 0) {
    throw new Error('estimated_cost_usd must be exactly 0');
  }
  if (meta.requires_approval === true) {
    throw new Error('requires_approval=true is not eligible for autonomous GitHub dispatch');
  }
  if (meta.production_deploy === true) {
    throw new Error('production_deploy=true is forbidden in GitHub Agent Queue');
  }
  if (meta.paid_infra_required === true) {
    throw new Error('paid_infra_required=true is forbidden in GitHub Agent Queue');
  }
}

async function request(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  return { response, body };
}

const file = process.argv[2];
if (!file) {
  console.error('usage: github-agent-queue-submit.mjs <workpack.md>');
  process.exit(2);
}

const root = process.cwd();
const absolute = path.resolve(root, file);
const queueRoot = path.resolve(root, 'docs/01-development/github-agent-queue');
if (!(absolute === queueRoot || absolute.startsWith(queueRoot + path.sep))) {
  throw new Error('workpack must live under docs/01-development/github-agent-queue');
}

const orchestratorUrl = (process.env.OPSLY_ORCHESTRATOR_URL || '').replace(/\/+$/, '');
const token = process.env.PLATFORM_ADMIN_TOKEN || '';
if (!orchestratorUrl) throw new Error('OPSLY_ORCHESTRATOR_URL is required');
if (!token) throw new Error('PLATFORM_ADMIN_TOKEN is required');

const content = await fs.readFile(absolute, 'utf8');
const { meta, body } = parseFrontmatter(content);
assertSafe(meta);
if (!body) throw new Error('workpack body must not be empty');

const sha = process.env.GITHUB_SHA || crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
const requestId = `ghq:${meta.id}:${sha.slice(0, 12)}`;

const payload = {
  tenant_slug: 'local',
  request_id: requestId,
  idempotency_key: requestId,
  agent: 'local_opencode',
  agent_role: 'build',
  max_steps: Number(meta.max_steps || 6),
  goal: String(meta.title || meta.id),
  prompt_body: body,
  context: {
    source: 'github-agent-queue',
    github_sha: sha,
    github_repository: process.env.GITHUB_REPOSITORY || null,
    github_run_id: process.env.GITHUB_RUN_ID || null,
    workpack_id: meta.id,
    workpack_file: file,
    priority: meta.priority,
    owner: meta.owner,
    environment: meta.environment,
    cost_class: meta.cost_class,
    estimated_cost_usd: Number(meta.estimated_cost_usd),
    requires_pr: meta.requires_pr === true,
    production_deploy: false,
    paid_infra_required: false
  }
};

console.log(`Submitting ${meta.id} -> ${orchestratorUrl}/api/local/prompt-submit`);
const submit = await request(`${orchestratorUrl}/api/local/prompt-submit`, {
  method: 'POST',
  headers: {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'x-autonomy-approved': 'true'
  },
  body: JSON.stringify(payload)
});

if (!submit.response.ok) {
  console.error(JSON.stringify(submit.body, null, 2));
  throw new Error(`submit failed HTTP ${submit.response.status}`);
}

const jobId = String(submit.body.job_id || submit.body.request_id || requestId);
console.log(`DISPATCHED job_id=${jobId}`);

const pollSeconds = Number(process.env.OPSLY_GITHUB_AGENT_POLL_SECONDS || 300);
const deadline = Date.now() + pollSeconds * 1000;
while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 5000));
  const status = await request(`${orchestratorUrl}/api/job-status/${encodeURIComponent(jobId)}`, {
    headers: { authorization: `Bearer ${token}` }
  });
  if (!status.response.ok) {
    if (status.response.status === 404) continue;
    console.log(`status HTTP ${status.response.status}`);
    continue;
  }

  const state = String(status.body.status || status.body.state || '').toLowerCase();
  console.log(`status=${state || 'unknown'}`);
  if (['completed','done','success'].includes(state)) {
    console.log('GITHUB_AGENT_QUEUE_COMPLETED');
    if (status.body.result || status.body.output) {
      console.log(String(status.body.result || status.body.output).slice(0, 4000));
    }
    process.exit(0);
  }
  if (['failed','error','cancelled'].includes(state)) {
    console.error(JSON.stringify(status.body, null, 2));
    throw new Error(`job ended in terminal state: ${state}`);
  }
}

console.log(`DISPATCHED_PENDING job_id=${jobId} (worker may be offline; task remains in BullMQ)`);
