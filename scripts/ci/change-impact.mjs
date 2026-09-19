#!/usr/bin/env node
import process from 'node:process';

const REPO = process.env.GITHUB_REPOSITORY ?? 'cloudsysops/opsly';
const TOKEN = (process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? '').trim();

export const MANAGED_LABEL_PREFIXES = ['impact:', 'release:', 'merge:'];

const DOMAIN_RULES = [
  ['peskids', [
    /^apps\/peskids\//i,
    /^apps\/api\/(?:app\/api|lib)\/.*peskids/i,
    /^infra\/n8n\/workflows\/peskids\//i,
    /^runtime\/tenants\/.*peskids/i,
    /^scripts\/.*peskids/i,
    /^docs\/tenants\/peskids\//i,
  ]],
  ['health-travel', [
    /health[-_/ ]?travel/i,
    /smile[-_/ ]?trip/i,
  ]],
  ['games', [
    /^apps\/game-/i,
    /^tools\/games-/i,
    /astral[-_/ ]?arena/i,
    /\/games\//i,
  ]],
  ['content', [
    /^lib\/content-studio\//i,
    /^scripts\/content\//i,
    /^tools\/transcription\//i,
    /^tools\/live-automation\//i,
    /(?:^|\/)obs(?:[-_/]|\.)/i,
    /tiktok/i,
    /youtube/i,
  ]],
  ['platform', [
    /^apps\/admin\//i,
    /^apps\/portal\//i,
    /^apps\/icso\//i,
    /^lib\/revenue-core\//i,
    /^config\/vertical-blueprints\//i,
  ]],
  ['shared-runtime', [
    /^apps\/(?:orchestrator|llm-gateway|context-builder|mcp)\//i,
    /^lib\/(?:agent-|external-agent-|pattern-|sigma-|prompt-guard)/i,
    /^scripts\/ops\/.*(?:agent|worker|runtime|dispatch|queue|machine)/i,
    /^config\/(?:external-agent-registry|runtime-governor|compute-workers)/i,
    /^Dockerfile\.hermes$/i,
  ]],
  ['infra', [
    /^infra\//i,
    /^supabase\//i,
    /^runtime\//i,
    /^scripts\/.*(?:deploy|rebuild|vps-|migration)/i,
  ]],
  ['docs', [
    /^docs\//i,
    /\.md$/i,
  ]],
];

// A production release/apply step is required after merge. This does NOT mean
// the release itself is performed by the merge lane. Peskids/migrations remain
// governed at integration time too because their review surface is sensitive.
const RELEASE_REQUIRED_RULES = [
  /^apps\/peskids\//i,
  /^apps\/api\/(?:app\/api|lib)\/.*peskids/i,
  /^infra\/n8n\/workflows\/peskids\//i,
  /^runtime\/tenants\/.*peskids/i,
  /^scripts\/.*peskids.*(?:deploy|rebuild|migration)/i,
  /^supabase\/migrations\//i,
  /^infra\/docker-compose\.(?:platform|peskids)/i,
  /^scripts\/.*(?:deploy|rebuild|vps-)/i,
];

// These paths alter the control plane merely by being merged to main. Keep
// them out of unattended daytime merge; independent review/governed merge is
// required.
const GOVERNED_MERGE_RULES = [
  /^\.github\/workflows\//i,
  /^scripts\/ci\//i,
  /^config\/pr-triage-policy\.json$/i,
  /^config\/runtime-governor\.json$/i,
  /^AGENTS\.md$/i,
];

const LABEL_SPECS = {
  'impact:peskids': ['B60205', 'Touches the Peskids tenant/product surface'],
  'impact:health-travel': ['1D76DB', 'Touches Health Travel'],
  'impact:games': ['7057FF', 'Touches Opsly Games'],
  'impact:content': ['A2EEEF', 'Touches Content Studio / media tooling'],
  'impact:platform': ['0E8A16', 'Touches platform/admin/revenue product surfaces'],
  'impact:shared-runtime': ['D93F0B', 'Touches shared runtime/control execution paths'],
  'impact:infra': ['5319E7', 'Touches infrastructure or migrations'],
  'impact:docs': ['0075CA', 'Documentation/reference impact'],
  'impact:control-plane': ['B60205', 'Changes CI/governance/control-plane behavior'],
  'release:required': ['FBCA04', 'Merge is separate; a governed release/apply step is still required'],
  'release:none': ['C2E0C6', 'No production release is required for this change'],
  'merge:daytime': ['0E8A16', 'Eligible for governed merge during the day; merge does not imply deploy'],
  'merge:governed': ['D93F0B', 'Sensitive/control-plane integration; requires the governed merge lane'],
};

function normalizePath(value) {
  return String(value ?? '').trim().replace(/^\.\//, '').replace(/\\/g, '/');
}

export function classifyChangeImpact(paths) {
  const normalized = [...new Set((paths ?? []).map(normalizePath).filter(Boolean))];
  const domains = [];

  for (const [domain, rules] of DOMAIN_RULES) {
    if (normalized.some((path) => rules.some((rule) => rule.test(path)))) domains.push(domain);
  }

  if (domains.length === 0) domains.push('platform');

  const releaseRequired = normalized.some((path) => RELEASE_REQUIRED_RULES.some((rule) => rule.test(path)));
  const controlPlane = normalized.some((path) => GOVERNED_MERGE_RULES.some((rule) => rule.test(path)));
  const governedMerge = controlPlane || releaseRequired || domains.includes('peskids');

  const labels = [
    ...domains.map((domain) => `impact:${domain}`),
    ...(controlPlane ? ['impact:control-plane'] : []),
    releaseRequired ? 'release:required' : 'release:none',
    governedMerge ? 'merge:governed' : 'merge:daytime',
  ];

  return {
    paths: normalized,
    domains,
    releaseRequired,
    governedMerge,
    mergeRoute: governedMerge ? 'governed' : 'daytime',
    labels,
  };
}

async function gh(pathname, { method = 'GET', body } = {}) {
  if (!TOKEN) throw new Error('GITHUB_TOKEN/GH_TOKEN is required for --pr/--all-open mode');
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
  if (!response.ok) throw new Error(`${method} ${pathname} -> ${response.status}: ${(await response.text()).slice(0, 600)}`);
  return response.status === 204 ? null : response.json();
}

async function ensureLabels() {
  for (const [name, [color, description]] of Object.entries(LABEL_SPECS)) {
    try {
      await gh(`repos/${REPO}/labels/${encodeURIComponent(name)}`);
    } catch (error) {
      if (!String(error?.message ?? '').includes('-> 404:')) throw error;
      await gh(`repos/${REPO}/labels`, { method: 'POST', body: { name, color, description } });
    }
  }
}

async function prPaths(prNumber) {
  const files = [];
  for (let page = 1; page <= 5; page += 1) {
    const chunk = await gh(`repos/${REPO}/pulls/${prNumber}/files?per_page=100&page=${page}`);
    files.push(...chunk.map((file) => file.filename));
    if (chunk.length < 100) break;
  }
  return files;
}

async function openPrNumbers() {
  const numbers = [];
  for (let page = 1; page <= 5; page += 1) {
    const chunk = await gh(`repos/${REPO}/pulls?state=open&per_page=100&page=${page}`);
    numbers.push(...chunk.map((pr) => pr.number));
    if (chunk.length < 100) break;
  }
  return numbers;
}

function isManagedLabel(name) {
  return MANAGED_LABEL_PREFIXES.some((prefix) => name.startsWith(prefix));
}

async function applyPr(prNumber, { ensure = true } = {}) {
  if (ensure) await ensureLabels();
  const [issue, paths] = await Promise.all([
    gh(`repos/${REPO}/issues/${prNumber}`),
    prPaths(prNumber),
  ]);
  const impact = classifyChangeImpact(paths);
  const preserved = (issue.labels ?? []).map((label) => label.name).filter((name) => !isManagedLabel(name));
  const labels = [...new Set([...preserved, ...impact.labels])].sort();
  await gh(`repos/${REPO}/issues/${prNumber}`, { method: 'PATCH', body: { labels } });
  return { pr: prNumber, ...impact, labels };
}

function parseArgs(argv) {
  const args = { pr: null, allOpen: false, paths: [], json: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--pr') args.pr = Number(argv[++i]);
    else if (argv[i] === '--all-open') args.allOpen = true;
    else if (argv[i] === '--json') args.json = true;
    else if (argv[i] === '--paths') args.paths.push(...argv.slice(i + 1));
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let result;

  if (args.allOpen) {
    await ensureLabels();
    const results = [];
    for (const prNumber of await openPrNumbers()) {
      results.push(await applyPr(prNumber, { ensure: false }));
    }
    result = results;
  } else if (args.pr) {
    result = await applyPr(args.pr);
  } else {
    result = classifyChangeImpact(args.paths);
  }

  console.log(args.json || args.pr || args.allOpen ? JSON.stringify(result, null, 2) : result.labels.join('\n'));
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(`change-impact: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
