#!/usr/bin/env node
import process from 'node:process';

const REPO = process.env.GITHUB_REPOSITORY ?? 'cloudsysops/opsly';
const TOKEN = (process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? '').trim();

const HARD_BLOCK_LABELS = new Set([
  'state:needs-fix',
  'state:waiting-human',
  'state:superseded',
  'stack:blocked',
]);

const IGNORED_CHECK_PATTERNS = [
  'production change window',
  'opsly-independent-review',
  'independent-review',
  'open-source-review',
];

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function latestByName(checkRuns) {
  const ordered = [...(checkRuns ?? [])].sort((a, b) => Number(b.id ?? 0) - Number(a.id ?? 0));
  const map = new Map();
  for (const run of ordered) {
    if (!map.has(run.name)) map.set(run.name, run);
  }
  return [...map.values()];
}

function isIgnoredCheck(name) {
  const value = normalize(name);
  return IGNORED_CHECK_PATTERNS.some((pattern) => value.includes(pattern));
}

export function evaluateCandidate({ pr, labels, checkRuns, statuses, route }) {
  const labelSet = new Set(labels ?? []);
  const reasons = [];

  if (pr?.base?.ref !== 'main') reasons.push('base-not-main');
  if (pr?.draft) reasons.push('draft');
  if (pr?.mergeable !== true) reasons.push('not-mergeable');
  if (!labelSet.has('state:ready')) reasons.push('not-state-ready');
  for (const label of HARD_BLOCK_LABELS) {
    if (labelSet.has(label)) reasons.push(`blocked:${label}`);
  }

  if (route === 'daytime') {
    if (!labelSet.has('merge:daytime')) reasons.push('missing-merge:daytime');
    if (labelSet.has('release:required')) reasons.push('release-required');
    if (labelSet.has('impact:peskids')) reasons.push('peskids-protected');
    if (labelSet.has('impact:control-plane')) reasons.push('control-plane');
    if (labelSet.has('merge:governed')) reasons.push('conflicting-governed-route');
  } else if (route === 'night') {
    if (!labelSet.has('night-merge')) reasons.push('missing-night-merge');
  } else {
    reasons.push('invalid-route');
  }

  const relevant = latestByName(checkRuns).filter((run) => !isIgnoredCheck(run.name));
  for (const run of relevant) {
    if (run.status !== 'completed') reasons.push(`pending:${run.name}`);
    else if (!['success', 'skipped', 'neutral'].includes(run.conclusion)) reasons.push(`failed:${run.name}`);
  }

  // Skip opsly-independent-review status check for night merges
  if (route !== 'night') {
    const statusMap = new Map();
    for (const status of statuses ?? []) {
      if (!statusMap.has(status.context)) statusMap.set(status.context, status);
    }
    const independent = statusMap.get('opsly-independent-review');
    if (!independent || independent.state !== 'success') reasons.push('independent-review-not-success');
  }

  return { eligible: reasons.length === 0, reasons };
}

async function gh(pathname) {
  if (!TOKEN) throw new Error('GITHUB_TOKEN/GH_TOKEN is required');
  const response = await fetch(`https://api.github.com/${pathname}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) throw new Error(`GET ${pathname} -> ${response.status}: ${(await response.text()).slice(0, 500)}`);
  return response.json();
}

async function inspectPr(prNumber, route) {
  // Fetch full PR details including head.sha and labels
  const pr = await gh(`repos/${REPO}/pulls/${prNumber}`);
  const labels = (pr.labels ?? []).map((label) => label.name);
  const sha = pr.head.sha;
  const [checks, status] = await Promise.all([
    gh(`repos/${REPO}/commits/${sha}/check-runs?per_page=100`),
    gh(`repos/${REPO}/commits/${sha}/status`),
  ]);
  const evaluation = evaluateCandidate({
    pr,
    labels,
    checkRuns: checks.check_runs ?? [],
    statuses: status.statuses ?? [],
    route,
  });
  return {
    number: pr.number,
    title: pr.title,
    sha,
    labels,
    ...evaluation,
  };
}

async function listOpenPrsWithLabel(routeLabel) {
  // Use issues endpoint with labels filter - this DOES include labels in results
  const all = [];
  for (let page = 1; page <= 3; page += 1) {
    const response = await gh(`repos/${REPO}/issues?labels=${encodeURIComponent(routeLabel)}&state=open&per_page=100&page=${page}`);
    for (const item of response) {
      if (item.pull_request) {
        all.push(item.number);
      }
    }
    if (response.length < 100) break;
  }
  return all;
}

function parseArgs(argv) {
  const args = { route: 'daytime', limit: 3, json: false, pr: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--route') args.route = argv[++i];
    else if (argv[i] === '--limit') args.limit = Math.max(1, Number(argv[++i] ?? 3));
    else if (argv[i] === '--json') args.json = true;
    else if (argv[i] === '--pr') args.pr = Number(argv[++i]);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const routeLabel = args.route === 'daytime' ? 'merge:daytime' : 'night-merge';
  
  let prNumbers;
  if (args.pr) {
    prNumbers = [args.pr];
  } else {
    prNumbers = await listOpenPrsWithLabel(routeLabel);
  }
  
  const inspected = [];
  for (const prNumber of prNumbers) inspected.push(await inspectPr(prNumber, args.route));
  const eligible = inspected.filter((item) => item.eligible).sort((a, b) => a.number - b.number).slice(0, args.limit);

  if (args.json) {
    console.log(JSON.stringify({ route: args.route, eligible, inspected }, null, 2));
  } else {
    for (const item of eligible) console.log(item.number);
  }
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(`governed-merge-candidates: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
