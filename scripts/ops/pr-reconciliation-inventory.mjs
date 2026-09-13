#!/usr/bin/env node

/**
 * Read-only PR reconciliation inventory.
 *
 * Classifies open pull requests into operational lanes without mutating branches,
 * labels, checks, deployments, or production state.
 *
 * Required env:
 *   GITHUB_TOKEN
 * Optional env:
 *   GITHUB_REPOSITORY (default: cloudsysops/opsly)
 *   RECONCILIATION_OUTPUT (default: pr-reconciliation-inventory.json)
 */

import fs from 'node:fs/promises';

const repository = process.env.GITHUB_REPOSITORY || 'cloudsysops/opsly';
const token = process.env.GITHUB_TOKEN;
const outputPath = process.env.RECONCILIATION_OUTPUT || 'pr-reconciliation-inventory.json';

if (!token) {
  console.error('GITHUB_TOKEN is required');
  process.exit(2);
}

const [owner, repo] = repository.split('/');
if (!owner || !repo) {
  console.error(`Invalid GITHUB_REPOSITORY: ${repository}`);
  process.exit(2);
}

const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'opsly-pr-reconciliation-inventory',
};

async function gh(path) {
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status} for ${path}: ${body.slice(0, 500)}`);
  }
  return response.json();
}

async function listOpenPulls() {
  const pulls = [];
  for (let page = 1; ; page += 1) {
    const batch = await gh(`/repos/${owner}/${repo}/pulls?state=open&per_page=100&page=${page}`);
    pulls.push(...batch);
    if (batch.length < 100) return pulls;
  }
}

async function listAllReviews(prNumber) {
  const reviews = [];
  for (let page = 1; ; page += 1) {
    const batch = await gh(`/repos/${owner}/${repo}/pulls/${prNumber}/reviews?per_page=100&page=${page}`);
    reviews.push(...batch);
    if (batch.length < 100) return reviews;
  }
}

async function listIssueComments(prNumber) {
  const comments = [];
  for (let page = 1; ; page += 1) {
    const batch = await gh(`/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100&page=${page}`);
    comments.push(...batch);
    if (batch.length < 100) return comments;
  }
}

function containsProtectedSurface(pull, files) {
  const text = `${pull.title}\n${pull.body || ''}\n${pull.head.ref}`.toLowerCase();
  const protectedText = /(peskids|production|prod\b|n8n|doppler|dns|traefik|supabase migration|database migration)/.test(text);
  const protectedFiles = files.some((file) => {
    const name = file.filename.toLowerCase();
    return (
      name.includes('peskids') ||
      name.includes('production') ||
      name.includes('n8n') ||
      name.includes('doppler') ||
      name.includes('traefik') ||
      name.includes('/migrations/') ||
      name.startsWith('supabase/migrations/')
    );
  });
  return protectedText || protectedFiles;
}

function supersededByReference(pull, comments, openPullNumbers) {
  const haystack = [pull.body || '', ...comments.map((comment) => comment.body || '')].join('\n');
  const matches = [...haystack.matchAll(/supersed(?:e|es|ed|ing)[^#\n]{0,80}#(\d+)/gi)];
  // This PR is superseded only if another open PR explicitly points at it.
  // The reverse relation is handled in the second pass.
  return matches.map((match) => Number(match[1])).filter((number) => openPullNumbers.has(number));
}

function unresolvedReviewState(reviews) {
  const latestByUser = new Map();
  for (const review of reviews) {
    if (!review.user?.login) continue;
    const previous = latestByUser.get(review.user.login);
    const submitted = Date.parse(review.submitted_at || 0);
    const previousSubmitted = Date.parse(previous?.submitted_at || 0);
    if (!previous || submitted >= previousSubmitted) latestByUser.set(review.user.login, review);
  }
  return [...latestByUser.values()].some((review) => review.state === 'CHANGES_REQUESTED');
}

function checkSummary(checkRuns) {
  const requiredLike = checkRuns.filter((run) => !['skipped', 'neutral'].includes(run.conclusion));
  const pending = requiredLike.filter((run) => !run.conclusion || ['queued', 'in_progress', 'waiting', 'pending'].includes(run.status));
  const failed = requiredLike.filter((run) => ['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure'].includes(run.conclusion));
  return {
    total: checkRuns.length,
    pending: pending.map((run) => run.name),
    failed: failed.map((run) => run.name),
  };
}

function chooseLane(record) {
  if (record.protected) return 'PROTECTED';
  if (record.supersededBy.length > 0) return 'SUPERSEDED';
  if (record.reviewBlocked) return 'REVIEW_BLOCKED';
  if (record.checks.failed.length > 0) return 'CHECK_FAILED';
  if (record.mergeable === false || record.mergeableState === 'dirty') return 'CONFLICTED';
  if (record.behindBy > 0) return 'BEHIND';
  if (record.checks.pending.length > 0) return 'CHECK_PENDING';
  if (record.mergeable === true) return 'MERGE_READY';
  return 'UNKNOWN';
}

const pulls = await listOpenPulls();
const openPullNumbers = new Set(pulls.map((pull) => pull.number));
const records = [];

for (const pull of pulls) {
  const [detail, files, reviews, comments, compare, checks] = await Promise.all([
    gh(`/repos/${owner}/${repo}/pulls/${pull.number}`),
    gh(`/repos/${owner}/${repo}/pulls/${pull.number}/files?per_page=100`),
    listAllReviews(pull.number),
    listIssueComments(pull.number),
    gh(`/repos/${owner}/${repo}/compare/${encodeURIComponent(pull.base.ref)}...${encodeURIComponent(pull.head.ref)}`),
    gh(`/repos/${owner}/${repo}/commits/${pull.head.sha}/check-runs?per_page=100`),
  ]);

  records.push({
    number: pull.number,
    title: pull.title,
    url: pull.html_url,
    head: pull.head.ref,
    headSha: pull.head.sha,
    base: pull.base.ref,
    mergeable: detail.mergeable,
    mergeableState: detail.mergeable_state,
    aheadBy: compare.ahead_by ?? 0,
    behindBy: compare.behind_by ?? 0,
    protected: containsProtectedSurface(pull, files),
    reviewBlocked: unresolvedReviewState(reviews),
    supersedes: supersededByReference(pull, comments, openPullNumbers),
    supersededBy: [],
    checks: checkSummary(checks.check_runs || []),
  });
}

const byNumber = new Map(records.map((record) => [record.number, record]));
for (const record of records) {
  for (const supersededNumber of record.supersedes) {
    const target = byNumber.get(supersededNumber);
    if (target && !target.supersededBy.includes(record.number)) target.supersededBy.push(record.number);
  }
}

for (const record of records) record.lane = chooseLane(record);

const laneOrder = [
  'MERGE_READY',
  'BEHIND',
  'CONFLICTED',
  'CHECK_FAILED',
  'CHECK_PENDING',
  'REVIEW_BLOCKED',
  'SUPERSEDED',
  'PROTECTED',
  'UNKNOWN',
];

records.sort((a, b) => {
  const laneDelta = laneOrder.indexOf(a.lane) - laneOrder.indexOf(b.lane);
  if (laneDelta !== 0) return laneDelta;
  return a.number - b.number;
});

const summary = Object.fromEntries(laneOrder.map((lane) => [lane, records.filter((record) => record.lane === lane).length]));
const payload = {
  generatedAt: new Date().toISOString(),
  repository,
  mode: 'READ_ONLY',
  invariants: {
    autoMerge: false,
    autoDeploy: false,
    mutateProduction: false,
    protectedSurfaces: ['peskids', 'production', 'n8n', 'doppler', 'dns', 'traefik', 'migrations'],
  },
  summary,
  pullRequests: records,
};

await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

console.log(`PR reconciliation inventory: ${repository}`);
for (const lane of laneOrder) console.log(`${lane.padEnd(16)} ${summary[lane]}`);
console.log(`Wrote ${outputPath}`);
