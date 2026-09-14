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

const pull = await gh(`/repos/${owner}/${repo}/pulls/${Number(request.pr_number)}`);
const files = await gh(`/repos/${owner}/${repo}/pulls/${Number(request.pr_number)}/files?per_page=100`);
const decision = evaluateRepairRequest(request, policy, {
  current_head_sha: pull?.head?.sha || null,
  title: pull?.title || '',
  body: pull?.body || '',
  branch: pull?.head?.ref || '',
  files: Array.isArray(files) ? files.map((file) => file.filename) : [],
});

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
  const runId = Number(request.run_id);
  if (!Number.isInteger(runId) || runId <= 0) throw new Error('run_id is required for rerun_failed_jobs');
  await gh(`/repos/${owner}/${repo}/actions/runs/${runId}/rerun-failed-jobs`, { method: 'POST' });
  result.applied = true;
  result.applied_at = new Date().toISOString();
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!decision.allowed) process.exitCode = 3;
