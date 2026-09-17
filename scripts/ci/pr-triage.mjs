#!/usr/bin/env node
/**
 * Mission Control PR triage.
 *
 * Safe boundaries:
 * - labels/comments only; never merges, deploys, closes PRs, deletes branches,
 *   rotates secrets, mutates production data or changes Peskids/n8n runtime.
 * - runs from trusted main via pull_request_target/workflow_run.
 * - priority labels are human-owned; this script never invents P0/P1.
 *
 * State model:
 * - draft / pending checks -> no managed state label
 * - real failure -> state:needs-fix
 * - real failure + PR Doctor marker for current SHA -> agent:working
 * - all observed non-ignored checks terminal-green -> state:ready
 */

import fs from 'node:fs/promises';
import process from 'node:process';

const REPO = process.env.OPSLY_GITHUB_REPO ?? process.env.GITHUB_REPOSITORY ?? 'cloudsysops/opsly';
const TOKEN = (process.env.GITHUB_TOKEN ?? '').trim();
const POLICY_PATH = new URL('../../config/pr-triage-policy.json', import.meta.url);

function parseArgs(argv) {
  const out = { pr: null, open: false, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--pr') out.pr = Number(argv[++i]);
    else if (argv[i] === '--open') out.open = true;
    else if (argv[i] === '--dry-run') out.dryRun = true;
  }
  if (!out.pr && !out.open) out.open = true;
  return out;
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function isIgnoredCheck(name, patterns) {
  const value = normalize(name);
  return patterns.some((pattern) => value.includes(normalize(pattern)));
}

export function classifyChecks(checkRuns, ignoredPatterns) {
  const relevant = (checkRuns ?? []).filter((run) => !isIgnoredCheck(run?.name, ignoredPatterns));
  if (relevant.length === 0) {
    return { state: 'unknown', failures: [], relevant };
  }

  const failures = relevant.filter((run) => run?.conclusion === 'failure');
  if (failures.length > 0) {
    return { state: 'needs-fix', failures, relevant };
  }

  const pending = relevant.some((run) => run?.status !== 'completed' || run?.conclusion == null);
  if (pending) {
    return { state: 'pending', failures: [], relevant };
  }

  const acceptable = new Set(['success', 'skipped', 'neutral']);
  const terminalBad = relevant.filter((run) => !acceptable.has(run?.conclusion));
  if (terminalBad.length > 0) {
    return { state: 'needs-fix', failures: terminalBad, relevant };
  }

  return { state: 'ready', failures: [], relevant };
}

export function hasDoctorMarker(comments, headSha) {
  const shortSha = String(headSha ?? '').slice(0, 8);
  if (!shortSha) return false;
  return (comments ?? []).some((comment) =>
    String(comment?.body ?? '').includes(`PR Doctor: fix dispatched for ${shortSha}`)
  );
}

async function gh(pathname, { method = 'GET', body } = {}) {
  const response = await fetch(`https://api.github.com/${pathname}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`GitHub API ${method} ${pathname} -> ${response.status}: ${detail.slice(0, 500)}`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

async function loadPolicy() {
  return JSON.parse(await fs.readFile(POLICY_PATH, 'utf8'));
}

async function ensureLabels(policy, dryRun) {
  for (const [name, spec] of Object.entries(policy.labels)) {
    try {
      const existing = await gh(`repos/${REPO}/labels/${encodeURIComponent(name)}`);
      const needsUpdate =
        normalize(existing?.color) !== normalize(spec.color) ||
        String(existing?.description ?? '') !== String(spec.description ?? '');
      if (needsUpdate && !dryRun) {
        await gh(`repos/${REPO}/labels/${encodeURIComponent(name)}`, {
          method: 'PATCH',
          body: { new_name: name, color: spec.color, description: spec.description },
        });
      }
    } catch (error) {
      if (error?.status !== 404) throw error;
      if (dryRun) continue;
      await gh(`repos/${REPO}/labels`, {
        method: 'POST',
        body: { name, color: spec.color, description: spec.description },
      });
    }
  }
}

async function listOpenPrs() {
  return gh(`repos/${REPO}/pulls?state=open&per_page=100&sort=updated&direction=desc`);
}

async function fetchPr(number) {
  return gh(`repos/${REPO}/pulls/${number}`);
}

async function fetchChecks(sha) {
  const data = await gh(`repos/${REPO}/commits/${sha}/check-runs?per_page=100`);
  return data?.check_runs ?? [];
}

async function fetchComments(number) {
  return gh(`repos/${REPO}/issues/${number}/comments?per_page=100`);
}

async function setManagedLabels(pr, desiredManaged, policy, dryRun) {
  const managed = new Set(policy.managed_state_labels);
  const current = new Set((pr.labels ?? []).map((label) => label.name));
  const next = new Set([...current].filter((label) => !managed.has(label)));
  for (const label of desiredManaged) next.add(label);

  const currentSorted = [...current].sort();
  const nextSorted = [...next].sort();
  if (JSON.stringify(currentSorted) === JSON.stringify(nextSorted)) return false;

  if (!dryRun) {
    await gh(`repos/${REPO}/issues/${pr.number}`, {
      method: 'PATCH',
      body: { labels: nextSorted },
    });
  }
  return true;
}

async function triagePr(pr, policy, dryRun) {
  if (pr.draft) {
    const changed = await setManagedLabels(pr, [], policy, dryRun);
    console.log(`#${pr.number} draft -> managed labels cleared${changed ? ' (changed)' : ''}`);
    return { number: pr.number, state: 'draft', changed };
  }

  const checks = await fetchChecks(pr.head.sha);
  const classification = classifyChecks(checks, policy.ignored_check_patterns);

  let desired = [];
  if (classification.state === 'needs-fix') {
    desired = ['state:needs-fix'];
    const comments = await fetchComments(pr.number);
    if (hasDoctorMarker(comments, pr.head.sha)) desired.push('agent:working');
  } else if (classification.state === 'ready') {
    desired = ['state:ready'];
  }

  const changed = await setManagedLabels(pr, desired, policy, dryRun);
  const failing = classification.failures.map((run) => run.name).join(', ');
  console.log(
    `#${pr.number} ${classification.state}${failing ? ` [${failing}]` : ''}${changed ? ' (labels changed)' : ''}`
  );
  return { number: pr.number, state: classification.state, changed, failing: classification.failures.map((run) => run.name) };
}

function priorityCounts(prs, policy) {
  const counts = {};
  for (const label of Object.keys(policy.priority_limits)) counts[label] = 0;
  for (const pr of prs) {
    const labels = new Set((pr.labels ?? []).map((label) => label.name));
    for (const priority of Object.keys(counts)) {
      if (labels.has(priority)) counts[priority] += 1;
    }
  }
  return counts;
}

function reportPriorityBudgets(prs, policy) {
  const counts = priorityCounts(prs, policy);
  for (const [label, limit] of Object.entries(policy.priority_limits)) {
    const count = counts[label] ?? 0;
    const message = `${label}: ${count}/${limit}`;
    if (count > limit) console.log(`::warning title=Mission Control WIP budget exceeded::${message}`);
    else console.log(message);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!TOKEN) throw new Error('GITHUB_TOKEN is required.');

  const policy = await loadPolicy();
  await ensureLabels(policy, args.dryRun);

  const openPrs = await listOpenPrs();
  reportPriorityBudgets(openPrs, policy);

  const targets = args.pr
    ? [await fetchPr(args.pr)]
    : openPrs;

  for (const pr of targets) {
    await triagePr(pr, policy, args.dryRun);
  }
}

const invokedDirectly = process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url;
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`pr-triage: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
