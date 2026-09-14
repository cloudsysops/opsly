#!/usr/bin/env node
import fs from 'node:fs/promises';
import { evaluateRepairRequest } from './lib/software-factory-repair-policy.mjs';

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
const policy = JSON.parse(await fs.readFile(args.policy, 'utf8'));
const protectedPolicyPath = String(
  policy.protected_policy_path || 'config/pr-reconciliation-policy.json'
);
const protectedPolicy = JSON.parse(await fs.readFile(protectedPolicyPath, 'utf8'));
const canonicalProtectedPatterns = protectedPolicy?.protected?.patterns;
if (!Array.isArray(canonicalProtectedPatterns) || canonicalProtectedPatterns.length === 0) {
  throw new Error('canonical protected-surface policy is missing or empty');
}
policy.protected_patterns = canonicalProtectedPatterns;
const repository = request.repository || process.env.GITHUB_REPOSITORY || 'cloudsysops/opsly';
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
  return response.json();
}

async function ghPaged(path) {
  const values = [];
  for (let page = 1; page <= 100; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const batch = await gh(`${path}${separator}per_page=100&page=${page}`);
    if (!Array.isArray(batch)) throw new Error(`expected array from GitHub endpoint ${path}`);
    values.push(...batch);
    if (batch.length < 100) return values;
  }
  throw new Error(`GitHub pagination exceeded safe cap for ${path}; refusing incomplete repair evidence`);
}

const prNumber = Number(request.pr_number);
const runId = Number(request.run_id);
if (!Number.isInteger(runId) || runId <= 0) {
  throw new Error('run_id is required for rerun_failed_jobs');
}

const [pull, files, run] = await Promise.all([
  gh(`/repos/${owner}/${repo}/pulls/${prNumber}`),
  ghPaged(`/repos/${owner}/${repo}/pulls/${prNumber}/files`),
  gh(`/repos/${owner}/${repo}/actions/runs/${runId}`),
]);

const runPullNumbers = Array.isArray(run?.pull_requests)
  ? run.pull_requests.map((item) => Number(item?.number)).filter(Number.isInteger)
  : [];
const decision = evaluateRepairRequest(request, policy, {
  current_head_sha: pull?.head?.sha || null,
  title: pull?.title || '',
  body: pull?.body || '',
  branch: pull?.head?.ref || '',
  files: files.map((file) => file.filename),
  run_head_sha: run?.head_sha || null,
  run_pr_number: runPullNumbers.length === 1 ? runPullNumbers[0] : null,
  run_event: run?.event || null,
  run_status: run?.status || null,
  run_conclusion: run?.conclusion || null,
  run_attempt: Number(run?.run_attempt ?? 1),
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
  await gh(`/repos/${owner}/${repo}/actions/runs/${runId}/rerun-failed-jobs`, { method: 'POST' });
  result.applied = true;
  result.applied_at = new Date().toISOString();
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!decision.allowed) process.exitCode = 3;
