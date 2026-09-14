#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateRepairRequest } from './lib/software-factory-repair-policy.mjs';

const CANONICAL_REPOSITORY = 'cloudsysops/opsly';
const TRUSTED_ROOT_ENV = 'OPSLY_SAFE_REPAIR_TRUSTED_ROOT';
const REPAIR_LOCK_TTL_SECONDS = 24 * 60 * 60;

function resolveTrustedApplyRoot() {
  const value = process.env[TRUSTED_ROOT_ENV]?.trim();
  if (!value) {
    throw new Error(`${TRUSTED_ROOT_ENV} is required for --apply; invoke Safe Repair from a trusted base checkout`);
  }
  return path.resolve(value);
}

function parseArgs(argv) {
  const args = { request: null, policy: 'config/software-factory-repair-policy.json', apply: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--request') args.request = argv[++i];
    else if (argv[i] === '--policy') args.policy = argv[++i];
    else if (argv[i] === '--apply') args.apply = true;
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  if (!args.request) throw new Error('usage: software-factory-safe-repair.mjs --request <json> [--apply]');
  return args;
}

const args = parseArgs(process.argv);
const request = JSON.parse(await fs.readFile(args.request, 'utf8'));

const trustedRoot = args.apply ? resolveTrustedApplyRoot() : process.cwd();
const canonicalPolicyPath = path.join(trustedRoot, 'config/software-factory-repair-policy.json');
const canonicalProtectedPolicyPath = path.join(trustedRoot, 'config/pr-reconciliation-policy.json');
const canonicalExecutorPath = path.join(trustedRoot, 'scripts/ops/software-factory-safe-repair.mjs');

if (args.apply) {
  const invokedPath = path.resolve(fileURLToPath(import.meta.url));
  if (invokedPath !== path.resolve(canonicalExecutorPath)) {
    throw new Error('--apply must execute the Safe Repair script from OPSLY_SAFE_REPAIR_TRUSTED_ROOT');
  }
}

const requestedPolicyPath = args.apply ? canonicalPolicyPath : path.resolve(args.policy);
if (args.apply && path.resolve(requestedPolicyPath) !== path.resolve(canonicalPolicyPath)) {
  throw new Error('--apply requires the canonical software-factory repair policy');
}

const policy = JSON.parse(await fs.readFile(requestedPolicyPath, 'utf8'));
const protectedPolicyPath = args.apply
  ? canonicalProtectedPolicyPath
  : path.resolve(String(policy.protected_policy_path || 'config/pr-reconciliation-policy.json'));
const protectedPolicy = JSON.parse(await fs.readFile(protectedPolicyPath, 'utf8'));
const canonicalProtectedPatterns = protectedPolicy?.protected?.patterns;
if (!Array.isArray(canonicalProtectedPatterns) || canonicalProtectedPatterns.length === 0) {
  throw new Error('canonical protected-surface policy is missing or empty');
}
policy.protected_patterns = canonicalProtectedPatterns;
const repository = request.repository || CANONICAL_REPOSITORY;
if (args.apply && repository !== CANONICAL_REPOSITORY) {
  throw new Error('--apply is restricted to the canonical repository');
}
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const [owner, repo] = repository.split('/');

if (!owner || !repo) throw new Error(`invalid repository: ${repository}`);

const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function gh(path, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status} for ${path}: ${body.slice(0, 500)}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text.trim()) return null;
  return JSON.parse(text);
}

async function ghPaged(path, expectedCount = null) {
  const values = [];
  for (let page = 1; page <= 100; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const batch = await gh(`${path}${separator}per_page=100&page=${page}`);
    if (!Array.isArray(batch)) throw new Error(`expected array from GitHub endpoint ${path}`);
    values.push(...batch);
    if (expectedCount !== null && values.length >= expectedCount) {
      if (values.length !== expectedCount) {
        throw new Error(`GitHub file count mismatch for ${path}`);
      }
      return values;
    }
    if (batch.length < 100) {
      if (expectedCount !== null && values.length !== expectedCount) {
        throw new Error(
          `GitHub file listing incomplete: observed ${values.length}, expected ${expectedCount}`
        );
      }
      return values;
    }
  }
  throw new Error(`GitHub pagination exceeded safe cap for ${path}; refusing incomplete repair evidence`);
}

async function ghRunJobs(runId) {
  const jobs = [];
  let expectedCount = null;
  for (let page = 1; page <= 20; page += 1) {
    const payload = await gh(
      `/repos/${owner}/${repo}/actions/runs/${runId}/jobs?per_page=100&page=${page}`
    );
    if (!payload || !Array.isArray(payload.jobs) || !Number.isInteger(Number(payload.total_count))) {
      throw new Error('workflow run jobs returned incomplete evidence');
    }
    if (expectedCount === null) expectedCount = Number(payload.total_count);
    jobs.push(...payload.jobs);
    if (jobs.length >= expectedCount) {
      if (jobs.length !== expectedCount) throw new Error('workflow run jobs count mismatch');
      return jobs;
    }
    if (payload.jobs.length < 100) break;
  }
  throw new Error('workflow run jobs pagination incomplete');
}

function classifyVerifiedFailure(jobs, policy) {
  if (!Array.isArray(jobs) || jobs.length === 0) return 'UNKNOWN';

  for (const job of jobs) {
    const status = String(job?.status || '').toLowerCase();
    const conclusion = String(job?.conclusion || '').toLowerCase();
    if (status !== 'completed' || !conclusion) return 'UNKNOWN';
  }

  const failed = jobs.filter((job) => {
    const conclusion = String(job?.conclusion || '').toLowerCase();
    return !['success', 'neutral', 'skipped'].includes(conclusion);
  });
  if (failed.length === 0) return 'UNKNOWN';

  const transient = new Set(
    Array.isArray(policy?.transient_conclusions)
      ? policy.transient_conclusions.map((value) => String(value).toLowerCase())
      : ['timed_out', 'startup_failure', 'stale'],
  );
  // 'cancelled' is intentionally not auto-transient: it may be operator or
  // cancel-in-progress behavior rather than infrastructure failure.
  return failed.every((job) => transient.has(String(job?.conclusion || '').toLowerCase()))
    ? 'INFRA_TRANSIENT'
    : 'UNKNOWN';
}

async function acquireRepairLock(repository, runId, runAttempt, workId) {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) throw new Error('REDIS_URL is required for --apply idempotency');
  const { createClient } = await import('redis');
  const redisPassword = process.env.REDIS_PASSWORD?.trim();
  const client = createClient({
    url: redisUrl,
    ...(redisPassword ? { password: redisPassword } : {}),
  });
  await client.connect();
  const key = `opsly:safe-repair:v1:${repository}:${runId}:${runAttempt}`;
  const result = await client.set(
    key,
    JSON.stringify({ work_id: workId, acquired_at: new Date().toISOString() }),
    { NX: true, EX: REPAIR_LOCK_TTL_SECONDS },
  );
  if (result !== 'OK') {
    await client.disconnect().catch(() => undefined);
    throw new Error('safe repair already claimed/applied for this workflow run attempt');
  }
  return { client, key };
}

const prNumber = Number(request.pr_number);
const runId = Number(request.run_id);
if (!Number.isInteger(runId) || runId <= 0) {
  throw new Error('run_id is required for rerun_failed_jobs');
}

const [pull, run, jobs] = await Promise.all([
  gh(`/repos/${owner}/${repo}/pulls/${prNumber}`),
  gh(`/repos/${owner}/${repo}/actions/runs/${runId}`),
  ghRunJobs(runId),
]);

const changedFiles = Number(pull?.changed_files);
if (!Number.isInteger(changedFiles) || changedFiles < 0) {
  throw new Error('pull request changed_files evidence is missing');
}
const files = await ghPaged(
  `/repos/${owner}/${repo}/pulls/${prNumber}/files`,
  changedFiles,
);
const runAttempt = Number(run?.run_attempt);
const verifiedFailureClass = classifyVerifiedFailure(jobs, policy);
const runPullNumbers = Array.isArray(run?.pull_requests)
  ? run.pull_requests.map((item) => Number(item?.number)).filter(Number.isInteger)
  : [];
const decision = evaluateRepairRequest(request, policy, {
  current_head_sha: pull?.head?.sha || null,
  files: files.map((file) => file.filename),
  run_head_sha: run?.head_sha || null,
  run_pr_number: runPullNumbers.length === 1 ? runPullNumbers[0] : null,
  run_event: run?.event || null,
  run_status: run?.status || null,
  run_conclusion: run?.conclusion || null,
  run_attempt: runAttempt,
  verified_failure_class: verifiedFailureClass,
  pr_title: pull?.title || '',
  pr_body: pull?.body || '',
  head_ref: pull?.head?.ref || '',
});

if (!runPullNumbers.includes(prNumber)) {
  decision.allowed = false;
  decision.mode = 'BLOCKED';
  decision.reasons = [...decision.reasons, 'workflow run is not associated with requested pull request'];
}

const result = {
  ...decision,
  repository,
  apply_requested: args.apply,
  applied: false,
  applied_at: null,
};

if (decision.allowed && args.apply) {
  if (!token) throw new Error('GITHUB_TOKEN or GH_TOKEN is required for --apply');
  if (decision.action !== 'rerun_failed_jobs') {
    throw new Error(`unsupported safe repair action: ${decision.action}`);
  }

  const lock = await acquireRepairLock(repository, runId, runAttempt, request.work_id);
  let keepLock = false;
  try {
    const [latestPull, latestRun] = await Promise.all([
      gh(`/repos/${owner}/${repo}/pulls/${prNumber}`),
      gh(`/repos/${owner}/${repo}/actions/runs/${runId}`),
    ]);
    const latestPullNumbers = Array.isArray(latestRun?.pull_requests)
      ? latestRun.pull_requests.map((item) => Number(item?.number)).filter(Number.isInteger)
      : [];
    if (latestPull?.head?.sha !== request.expected_head_sha) {
      throw new Error('pull request head changed before safe repair mutation');
    }
    if (latestRun?.head_sha !== request.expected_head_sha) {
      throw new Error('workflow run head changed before safe repair mutation');
    }
    if (Number(latestRun?.run_attempt) !== runAttempt) {
      throw new Error('workflow run attempt changed before safe repair mutation');
    }
    if (
      latestRun?.event !== 'pull_request' ||
      latestRun?.status !== 'completed' ||
      latestRun?.conclusion !== 'failure' ||
      !latestPullNumbers.includes(prNumber)
    ) {
      throw new Error('workflow run eligibility changed before safe repair mutation');
    }

    // From this point onward the mutation outcome can become ambiguous on a
    // transport failure after GitHub accepted the request. Preserve the claim
    // in every such case; a supervisor must reconcile before another attempt.
    keepLock = true;
    await gh(`/repos/${owner}/${repo}/actions/runs/${runId}/rerun-failed-jobs`, {
      method: 'POST',
    });
    result.applied = true;
    result.applied_at = new Date().toISOString();
  } finally {
    if (!keepLock) {
      await lock.client.del(lock.key).catch(() => undefined);
    }
    await lock.client.disconnect().catch(() => undefined);
  }
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!decision.allowed) process.exitCode = 3;
