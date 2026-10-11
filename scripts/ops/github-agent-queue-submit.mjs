#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

function parseScalar(raw = '') {
  const value = raw.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error('workpack must start with YAML frontmatter');
  const meta = {};
  for (const raw of match[1].split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1);
    meta[key] = parseScalar(value);
  }
  return { meta, body: match[2].trim() };
}

function requireField(meta, key) {
  if (meta[key] === undefined || meta[key] === null || meta[key] === '') {
    throw new Error(`missing required frontmatter field: ${key}`);
  }
}

function requireBooleanField(meta, key) {
  requireField(meta, key);
  if (typeof meta[key] !== 'boolean') {
    throw new Error(`${key} must be an explicit YAML boolean without inline comments`);
  }
}

function listField(value) {
  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean);
  if (typeof value !== 'string' || value.trim() === '') return [];
  const trimmed = value.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed.replace(/'/g, '"'));
      if (Array.isArray(parsed)) {
        return parsed.map(String).map((v) => v.trim()).filter(Boolean);
      }
    } catch {}
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((v) => v.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }
  return trimmed.split(',').map((v) => v.trim()).filter(Boolean);
}

function typedWriteEnabled() {
  return process.env.OPSLY_GITHUB_AGENT_TYPED_WRITE === 'true';
}

function readPreMintedWriteApprovalId() {
  const approvalId = String(process.env.OPSLY_GITHUB_AGENT_WRITE_APPROVAL_ID || '').trim();
  if (!approvalId) {
    throw new Error(
      'OPSLY_GITHUB_AGENT_WRITE_APPROVAL_ID is required for typed write (pre-minted AgentTaskWriteApprovalV1)'
    );
  }
  return approvalId;
}

function readTypedWriteBinding() {
  const repository = String(
    process.env.OPSLY_GITHUB_AGENT_WRITE_REPOSITORY || process.env.GITHUB_REPOSITORY || ''
  ).trim();
  const prNumber = Number(process.env.OPSLY_GITHUB_AGENT_WRITE_PR_NUMBER || '');
  const prBranch = String(process.env.OPSLY_GITHUB_AGENT_WRITE_PR_BRANCH || '').trim();
  const prHeadSha = String(process.env.OPSLY_GITHUB_AGENT_WRITE_PR_HEAD_SHA || '').trim().toLowerCase();
  if (!repository) throw new Error('OPSLY_GITHUB_AGENT_WRITE_REPOSITORY (or GITHUB_REPOSITORY) is required for typed write');
  if (!Number.isInteger(prNumber) || prNumber < 1) {
    throw new Error('OPSLY_GITHUB_AGENT_WRITE_PR_NUMBER must be a positive integer for typed write');
  }
  if (!prBranch) throw new Error('OPSLY_GITHUB_AGENT_WRITE_PR_BRANCH is required for typed write');
  if (!/^[a-f0-9]{40}$/.test(prHeadSha)) {
    throw new Error('OPSLY_GITHUB_AGENT_WRITE_PR_HEAD_SHA must be an exact 40-char git SHA');
  }
  return { repository, pr_number: prNumber, pr_branch: prBranch, pr_head_sha: prHeadSha };
}

function assertSafe(meta) {
  for (const key of [
    'id',
    'status',
    'priority',
    'agent',
    'owner',
    'environment',
    'cost_class',
    'estimated_cost_usd',
    'workstream',
    'conflict_key',
  ]) {
    requireField(meta, key);
  }
  for (const key of ['requires_pr','requires_approval','production_deploy','paid_infra_required']) {
    requireBooleanField(meta, key);
  }

  const allowedAgents = new Set(['local_opencode', 'local_hermes', 'local_openclaw']);
  if (!allowedAgents.has(String(meta.agent))) {
    throw new Error(
      'GitHub Agent Queue permits only governed local_opencode, local_hermes, or local_openclaw'
    );
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
  const typedWrite = typedWriteEnabled();
  if (meta.requires_pr === true && !typedWrite) {
    throw new Error('requires_pr=true is not eligible for autonomous GitHub dispatch yet');
  }
  if (meta.requires_approval === true && !typedWrite) {
    throw new Error('requires_approval=true is not eligible for autonomous GitHub dispatch');
  }
  if (typedWrite) {
    if (meta.requires_pr !== true || meta.requires_approval !== true) {
      throw new Error(
        'OPSLY_GITHUB_AGENT_TYPED_WRITE=true requires workpack requires_pr=true and requires_approval=true'
      );
    }
    readTypedWriteBinding();
    readPreMintedWriteApprovalId();
  }
  if (meta.production_deploy === true) {
    throw new Error('production_deploy=true is forbidden in GitHub Agent Queue');
  }
  if (meta.paid_infra_required === true) {
    throw new Error('paid_infra_required=true is forbidden in GitHub Agent Queue');
  }
}

function safeIdSegment(value) {
  const cleaned = String(value)
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return cleaned || 'workpack';
}

async function request(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  return { response, body };
}

function terminalResultText(output) {
  if (typeof output === 'string') return output.trim();
  if (!output || typeof output !== 'object') return '';
  for (const key of ['result', 'response', 'output', 'text']) {
    const value = output[key];
    if (typeof value === 'string') return value.trim();
  }
  return '';
}

const file = process.argv[2];
if (!file) {
  console.error('usage: github-agent-queue-submit.mjs <workpack.md>');
  process.exit(2);
}

const root = process.cwd();
const absolute = path.resolve(root, file);
const queueRoot = path.resolve(root, 'docs/01-development/night-queue');
if (!(absolute === queueRoot || absolute.startsWith(queueRoot + path.sep))) {
  throw new Error('workpack must live under docs/01-development/night-queue');
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
const requestId = `ghq-${safeIdSegment(meta.id)}-${sha.slice(0, 12)}`;
const typedWrite = typedWriteEnabled();
const writeBinding = typedWrite ? readTypedWriteBinding() : null;
const writeApprovalId = typedWrite ? readPreMintedWriteApprovalId() : null;
// DispatchClaimV1.claimId === requestId (server acquire). Pre-minted approval must use the same ids.
const writeClaimId = requestId;

const payload = {
  tenant_slug: 'local',
  request_id: requestId,
  idempotency_key: requestId,
  agent: String(meta.agent),
  // Read-only default remains review; typed write uses executor without weakening the default path.
  agent_role: typedWrite ? 'executor' : 'review',
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
    dispatch_contract_version: 'dispatch-claim-v1',
    workstream: String(meta.workstream),
    conflict_key: String(meta.conflict_key),
    semantic_scope: String(meta.semantic_scope || meta.conflict_key),
    affected_paths: listField(meta.affected_paths),
    depends_on: listField(meta.depends_on),
    priority: meta.priority,
    owner: meta.owner,
    environment: meta.environment,
    cost_class: meta.cost_class,
    estimated_cost_usd: Number(meta.estimated_cost_usd),
    requires_pr: typedWrite ? true : false,
    production_deploy: false,
    paid_infra_required: false,
    ...(typedWrite && writeBinding && writeApprovalId
      ? {
          // Propagate operator/admin pre-minted approval only — never mint here.
          work_id: String(meta.id),
          claim_id: writeClaimId,
          repository: writeBinding.repository,
          pr_number: writeBinding.pr_number,
          pr_branch: writeBinding.pr_branch,
          pr_head_sha: writeBinding.pr_head_sha,
          write_approval_ref: {
            schema_version: 'AgentTaskWriteApprovalV1',
            approval_id: writeApprovalId,
          },
        }
      : {}),
  }
};

const requireCompletion = process.env.OPSLY_GITHUB_AGENT_REQUIRE_COMPLETION === 'true';
const expectedMarker = (process.env.OPSLY_GITHUB_AGENT_EXPECT_MARKER || '').trim();

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

let existingCompletedJobId = '';
if (!submit.response.ok) {
  console.error(JSON.stringify(submit.body, null, 2));
  if (submit.response.status === 409 && submit.body?.dispatch_decision) {
    if (submit.body.dispatch_decision === 'ALREADY_DONE') {
      console.log(
        `ALREADY_DONE task=${submit.body.existing_task_id || 'unknown'} claim=${submit.body.existing_claim_id || 'unknown'}`
      );
      if (!requireCompletion || !expectedMarker) {
        process.exit(0);
      }
      if (!submit.body.existing_job_id) {
        throw new Error(
          'ALREADY_DONE_WITHOUT_JOB_EVIDENCE: exact marker cannot be revalidated'
        );
      }
      existingCompletedJobId = String(submit.body.existing_job_id);
      console.log(
        `ALREADY_DONE_REVALIDATE job_id=${existingCompletedJobId} expected_marker=${expectedMarker}`
      );
    }
    if (submit.body.dispatch_decision === 'JOIN_EXISTING') {
      console.error(
        `JOIN_EXISTING_NONTERMINAL task=${submit.body.existing_task_id || 'unknown'} job=${submit.body.existing_job_id || 'unknown'} claim=${submit.body.existing_claim_id || 'unknown'}`
      );
      throw new Error(
        'JOIN_EXISTING_NONTERMINAL: canonical work is still active; this submitter must not report success'
      );
    }
    if (submit.body.dispatch_decision === 'ALREADY_DONE' && existingCompletedJobId) {
      // Continue below and re-read the durable terminal result.
    } else if (submit.body.error === 'DISPATCH_SCOPE_ALREADY_OWNED') {
      throw new Error(
        `DISPATCH_SCOPE_ALREADY_OWNED: dispatch_decision=${submit.body.dispatch_decision} ` +
          `${submit.body.conflict_dimension || 'scope'}="${submit.body.conflict_scope || 'unknown'}" ` +
          `already owned by task=${submit.body.existing_task_id || 'unknown'} ` +
          `workstream=${submit.body.existing_workstream || 'unknown'} ` +
          `claim=${submit.body.existing_claim_id || 'unknown'}`
      );
    } else {
      throw new Error(
        `${submit.body.dispatch_decision}: ${submit.body.conflict_dimension || 'scope'} is already owned`
      );
    }
  }
  if (!existingCompletedJobId) {
    throw new Error(`submit failed HTTP ${submit.response.status}`);
  }
}

if (!existingCompletedJobId && (submit.body.prepared_only === true || submit.body.job_id === null || submit.body.job_id === undefined)) {
  console.error(JSON.stringify(submit.body, null, 2));
  throw new Error('PREPARED_ONLY: orchestrator did not enqueue the task');
}

const jobId = existingCompletedJobId || String(submit.body.job_id);
if (existingCompletedJobId) {
  console.log(`REVALIDATING_COMPLETED job_id=${jobId}`);
} else {
  console.log(`DISPATCHED job_id=${jobId}`);
}

if (!requireCompletion) {
  console.log(`DISPATCHED_PENDING job_id=${jobId} (queued for governed parallel execution)`);
  process.exit(0);
}

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
    const output = status.body.returnvalue ?? status.body.result ?? status.body.output;
    if (expectedMarker) {
      const actual = terminalResultText(output);
      if (actual !== expectedMarker) {
        console.error(
          JSON.stringify(
            { expected_marker: expectedMarker, actual_result: actual || null, output },
            null,
            2
          )
        );
        throw new Error('completed job did not return the expected acceptance marker');
      }
      console.log(`GITHUB_AGENT_QUEUE_MARKER_OK=${expectedMarker}`);
    }
    console.log('GITHUB_AGENT_QUEUE_COMPLETED');
    if (output !== undefined && output !== null) {
      console.log(
        (typeof output === 'string' ? output : JSON.stringify(output)).slice(0, 4000)
      );
    }
    process.exit(0);
  }
  if (['failed','error','cancelled'].includes(state)) {
    console.error(JSON.stringify(status.body, null, 2));
    throw new Error(`job ended in terminal state: ${state}`);
  }
}

throw new Error(`job did not reach a terminal state within ${pollSeconds}s: ${jobId}`);
