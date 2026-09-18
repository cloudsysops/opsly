#!/usr/bin/env node

import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { buildReconciliationDispatchPlan } from './lib/pr-reconciliation-dispatch-plan.mjs';

const workpacksPath = process.env.RECONCILIATION_WORKPACKS || 'pr-reconciliation-workpacks.json';
const outputPath = process.env.RECONCILIATION_DISPATCH_REPORT || 'pr-reconciliation-dispatch-report.json';
const repository = process.env.GITHUB_REPOSITORY || 'cloudsysops/opsly';
const token = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
const dryRun = ['1', 'true', 'yes'].includes(String(process.env.RECONCILIATION_DRY_RUN || '').toLowerCase());
const maxDispatch = Math.max(1, Math.min(20, Number(process.env.RECONCILIATION_MAX_DISPATCH || 8)));

if (!token) {
  console.error('GITHUB_TOKEN is required');
  process.exit(2);
}

const source = JSON.parse(await fs.readFile(workpacksPath, 'utf8'));
const plan = buildReconciliationDispatchPlan(source);

async function gh(path, { method = 'GET', body } = {}) {
  const response = await fetch(`https://api.github.com/${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`GitHub API ${method} ${path} -> ${response.status}: ${detail.slice(0, 500)}`);
  }
  return response.status === 204 ? null : response.json();
}

function runPrDoctor(prNumber, reviewBlocked = false) {
  const args = ['scripts/ci/pr-doctor.mjs', '--pr', String(prNumber)];
  if (reviewBlocked) args.push('--review-blocked');
  if (dryRun) args.push('--dry-run');

  const result = spawnSync(process.execPath, args, {
    stdio: 'pipe',
    encoding: 'utf8',
    env: process.env,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`PR Doctor exited ${result.status} for #${prNumber}`);
  }
}

async function dispatchIndependentReview(prNumber) {
  if (dryRun) {
    console.log(`[dry-run] dispatch independent review for #${prNumber}`);
    return;
  }
  await gh(`repos/${repository}/actions/workflows/backend-independent-review.yml/dispatches`, {
    method: 'POST',
    body: {
      ref: 'main',
      inputs: { pr_number: String(prNumber) },
    },
  });
  console.log(`#${prNumber} independent review dispatched`);
}

const report = {
  schema_version: 'ReconciliationDispatchReportV1',
  generated_at: new Date().toISOString(),
  repository,
  dry_run: dryRun,
  max_dispatch: maxDispatch,
  attempted: 0,
  dispatched: 0,
  skipped: 0,
  failed: 0,
  results: [],
};

for (const action of plan.actions) {
  if (report.attempted >= maxDispatch) {
    report.results.push({
      pr_number: action.prNumber,
      action: action.action,
      result: 'SKIPPED_LIMIT',
      expected_head_sha: action.expectedHeadSha,
    });
    report.skipped += 1;
    continue;
  }

  if (!['DISPATCH_PR_DOCTOR', 'DISPATCH_PR_DOCTOR_REVIEW', 'DISPATCH_INDEPENDENT_REVIEW'].includes(action.action)) {
    report.results.push({
      pr_number: action.prNumber,
      action: action.action,
      result: 'HOLD',
      reason: action.reason,
      expected_head_sha: action.expectedHeadSha,
    });
    report.skipped += 1;
    continue;
  }

  report.attempted += 1;

  try {
    const pr = await gh(`repos/${repository}/pulls/${action.prNumber}`);
    if (pr.state !== 'open' || pr.draft === true) {
      report.results.push({
        pr_number: action.prNumber,
        action: action.action,
        result: 'SKIPPED_NOT_OPEN',
      });
      report.skipped += 1;
      continue;
    }
    if (pr.head.sha !== action.expectedHeadSha) {
      report.results.push({
        pr_number: action.prNumber,
        action: action.action,
        result: 'SKIPPED_HEAD_MOVED',
        expected_head_sha: action.expectedHeadSha,
        actual_head_sha: pr.head.sha,
      });
      report.skipped += 1;
      continue;
    }

    if (action.action === 'DISPATCH_PR_DOCTOR') {
      runPrDoctor(action.prNumber, false);
    } else if (action.action === 'DISPATCH_PR_DOCTOR_REVIEW') {
      runPrDoctor(action.prNumber, true);
    } else {
      await dispatchIndependentReview(action.prNumber);
    }

    report.results.push({
      pr_number: action.prNumber,
      action: action.action,
      result: dryRun ? 'DRY_RUN' : 'DISPATCHED',
      expected_head_sha: action.expectedHeadSha,
    });
    report.dispatched += 1;
  } catch (error) {
    report.results.push({
      pr_number: action.prNumber,
      action: action.action,
      result: 'FAILED',
      error: error instanceof Error ? error.message : String(error),
      expected_head_sha: action.expectedHeadSha,
    });
    report.failed += 1;
  }
}

await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`Reconciliation dispatch: attempted=${report.attempted} dispatched=${report.dispatched} failed=${report.failed} skipped=${report.skipped}`);
console.log(`Wrote ${outputPath}`);

if (report.failed > 0) process.exitCode = 1;
