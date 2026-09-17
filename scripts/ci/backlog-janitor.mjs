#!/usr/bin/env node
import process from 'node:process';

const REPO = process.env.GITHUB_REPOSITORY ?? 'cloudsysops/opsly';
const TOKEN = (process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? '').trim();

const PROTECTED_LABELS = new Set([
  'priority:P0',
  'priority:P1',
  'state:waiting-human',
  'agent:working',
]);

function parseArgs(argv) {
  const out = { dryRun: false, limit: 10, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--dry-run') out.dryRun = true;
    else if (argv[i] === '--json') out.json = true;
    else if (argv[i] === '--limit') out.limit = Math.max(1, Number(argv[++i] ?? 10));
  }
  return out;
}

export function supersededNumbers(body) {
  const found = new Set();
  for (const rawLine of String(body ?? '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!/\b(?:supersedes?|replaces?)\b/i.test(line)) continue;
    // Fail closed on explicitly ambiguous alternatives. "Supersedes #1 and #2"
    // is deterministic; "Supersedes #1 or #2" is not.
    if (/\bor\b/i.test(line)) continue;
    for (const match of line.matchAll(/#(\d+)/g)) found.add(Number(match[1]));
  }
  return [...found].filter((number) => Number.isInteger(number) && number > 0);
}

export function closeDecision({ target, replacement }) {
  const reasons = [];
  if (!target || !replacement) reasons.push('missing-evidence');
  if (target?.state !== 'open') reasons.push('target-not-open');
  if (!replacement?.merged_at) reasons.push('replacement-not-merged');
  if (target?.number === replacement?.number) reasons.push('self-reference');

  const labels = new Set((target?.labels ?? []).map((label) => typeof label === 'string' ? label : label?.name));
  for (const label of PROTECTED_LABELS) {
    if (labels.has(label)) reasons.push(`protected:${label}`);
  }

  const targetCreated = Date.parse(target?.created_at ?? '');
  const targetUpdated = Date.parse(target?.updated_at ?? '');
  const replacementCreated = Date.parse(replacement?.created_at ?? '');
  const replacementMerged = Date.parse(replacement?.merged_at ?? '');
  if (![targetCreated, targetUpdated, replacementCreated, replacementMerged].every(Number.isFinite)) {
    reasons.push('invalid-timestamps');
  } else {
    if (targetCreated >= replacementCreated) reasons.push('target-not-older');
    if (targetUpdated > replacementMerged) reasons.push('target-updated-after-replacement-merge');
  }

  return { close: reasons.length === 0, reasons };
}

async function gh(pathname, { method = 'GET', body } = {}) {
  if (!TOKEN) throw new Error('GITHUB_TOKEN/GH_TOKEN is required');
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
    throw new Error(`${method} ${pathname} -> ${response.status}: ${(await response.text()).slice(0, 500)}`);
  }
  return response.status === 204 ? null : response.json();
}

async function listPulls(state) {
  const all = [];
  for (let page = 1; page <= 3; page += 1) {
    const chunk = await gh(`repos/${REPO}/pulls?state=${state}&base=main&sort=updated&direction=desc&per_page=100&page=${page}`);
    all.push(...chunk);
    if (chunk.length < 100) break;
  }
  return all;
}

function replacementEvidence(closedPulls) {
  const map = new Map();
  for (const replacement of closedPulls) {
    if (!replacement.merged_at) continue;
    for (const targetNumber of supersededNumbers(replacement.body)) {
      const existing = map.get(targetNumber);
      if (!existing || Date.parse(replacement.merged_at) > Date.parse(existing.merged_at)) {
        map.set(targetNumber, replacement);
      }
    }
  }
  return map;
}

async function markSuperseded(target, replacement, dryRun) {
  const decision = closeDecision({ target, replacement });
  const result = {
    target: target.number,
    replacement: replacement.number,
    close: decision.close,
    reasons: decision.reasons,
  };
  if (!decision.close || dryRun) return result;

  const currentLabels = (target.labels ?? []).map((label) => label.name);
  if (!currentLabels.includes('state:superseded')) {
    await gh(`repos/${REPO}/issues/${target.number}/labels`, {
      method: 'POST',
      body: { labels: ['state:superseded'] },
    });
  }

  await gh(`repos/${REPO}/issues/${target.number}/comments`, {
    method: 'POST',
    body: {
      body: `Backlog Janitor: closing as superseded by merged PR #${replacement.number}. Evidence is the explicit \`Supersedes #${target.number}\`/replacement reference in that merged PR. No branch deletion or code mutation performed.`,
    },
  });
  await gh(`repos/${REPO}/pulls/${target.number}`, {
    method: 'PATCH',
    body: { state: 'closed' },
  });
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [openPulls, closedPulls] = await Promise.all([listPulls('open'), listPulls('closed')]);
  const evidence = replacementEvidence(closedPulls);
  const candidates = openPulls
    .filter((pull) => evidence.has(pull.number))
    .sort((a, b) => a.number - b.number)
    .slice(0, args.limit);

  const results = [];
  for (const target of candidates) {
    results.push(await markSuperseded(target, evidence.get(target.number), args.dryRun));
  }

  const summary = {
    open_scanned: openPulls.length,
    merged_evidence_targets: evidence.size,
    candidates: candidates.length,
    closed: results.filter((item) => item.close && !args.dryRun).length,
    dry_run: args.dryRun,
    results,
  };

  if (args.json) console.log(JSON.stringify(summary, null, 2));
  else {
    console.log(`backlog-janitor open=${summary.open_scanned} candidates=${summary.candidates} closed=${summary.closed} dry_run=${summary.dry_run}`);
    for (const item of results) {
      console.log(`#${item.target} -> #${item.replacement}: ${item.close ? (args.dryRun ? 'WOULD_CLOSE' : 'CLOSED') : `SKIP ${item.reasons.join(',')}`}`);
    }
  }
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(`backlog-janitor: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
