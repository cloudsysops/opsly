#!/usr/bin/env node

import fs from 'node:fs/promises';

const repository = process.env.GITHUB_REPOSITORY || 'cloudsysops/opsly';
const token = process.env.GITHUB_TOKEN;
const outputPath = process.env.RECONCILIATION_CLEANUP || 'pr-reconciliation-cleanup-candidates.json';

if (!token) throw new Error('GITHUB_TOKEN is required');
const [owner, repo] = repository.split('/');

const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'opsly-pr-reconciliation-cleanup',
};

async function gh(path) {
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) throw new Error(`GitHub API ${response.status} for ${path}`);
  return response.json();
}

async function paged(path) {
  const items = [];
  for (let page = 1; ; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const batch = await gh(`${path}${separator}per_page=100&page=${page}`);
    items.push(...batch);
    if (batch.length < 100) return items;
  }
}

const [repoInfo, branches, openPulls, closedPulls] = await Promise.all([
  gh(`/repos/${owner}/${repo}`),
  paged(`/repos/${owner}/${repo}/branches`),
  paged(`/repos/${owner}/${repo}/pulls?state=open`),
  paged(`/repos/${owner}/${repo}/pulls?state=closed&sort=updated&direction=desc`),
]);

const protectedPatterns = /(peskids|production|prod\b|n8n|doppler|dns|traefik|migration)/i;
const defaultBranch = repoInfo.default_branch;
const activeHeads = new Set(openPulls.map((pr) => pr.head?.ref).filter(Boolean));
const activeBases = new Set(openPulls.map((pr) => pr.base?.ref).filter(Boolean));
const mergedByHead = new Map();
for (const pr of closedPulls) {
  if (!pr.merged_at || !pr.head?.ref) continue;
  const current = mergedByHead.get(pr.head.ref);
  if (!current || Date.parse(pr.merged_at) > Date.parse(current.mergedAt)) {
    mergedByHead.set(pr.head.ref, { prNumber: pr.number, mergedAt: pr.merged_at });
  }
}

const candidates = branches.map((branch) => {
  const name = branch.name;
  const reasons = [];
  const protectedSurface = protectedPatterns.test(name);
  const isDefault = name === defaultBranch;
  const isActiveHead = activeHeads.has(name);
  const isActiveBase = activeBases.has(name);
  const merged = mergedByHead.get(name) || null;

  if (isDefault) reasons.push('DEFAULT_BRANCH');
  if (isActiveHead) reasons.push('ACTIVE_PR_HEAD');
  if (isActiveBase) reasons.push('ACTIVE_PR_BASE');
  if (protectedSurface) reasons.push('PROTECTED_SURFACE');
  if (!merged) reasons.push('NO_CONFIRMED_MERGED_PR');

  const cleanupCandidate = Boolean(merged) && !isDefault && !isActiveHead && !isActiveBase && !protectedSurface;

  return {
    branch: name,
    sha: branch.commit?.sha || null,
    cleanupCandidate,
    mergedPr: merged,
    blockedReasons: cleanupCandidate ? [] : reasons,
  };
});

const payload = {
  generatedAt: new Date().toISOString(),
  repository,
  mode: 'READ_ONLY',
  deleteBranches: false,
  totalBranches: candidates.length,
  cleanupCandidateCount: candidates.filter((item) => item.cleanupCandidate).length,
  candidates,
};

await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Branch cleanup candidates: ${payload.cleanupCandidateCount}/${payload.totalBranches}`);
console.log(`Wrote ${outputPath}`);
