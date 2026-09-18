#!/usr/bin/env node
/**
 * Bounded backlog sweep for PR Doctor.
 *
 * Purpose: existing red PRs do not emit pull_request_target synchronize/opened/reopened,
 * so PR Doctor would never see them again. This sweep discovers a bounded set of open,
 * non-draft PRs and invokes the existing trusted pr-doctor implementation for each.
 * pr-doctor remains the authority for ignored policy gates, idempotency and dispatch.
 */
'use strict';

import { spawnSync } from 'node:child_process';

const REPO = process.env.OPSLY_GITHUB_REPO ?? 'cloudsysops/opsly';
const TOKEN = (process.env.GITHUB_TOKEN ?? '').trim();
const MAX_PRS = Math.max(1, Math.min(Number(process.env.OPSLY_DOCTOR_SWEEP_MAX_PRS ?? 12), 30));

async function gh(pathname) {
  const resp = await fetch(`https://api.github.com/${pathname}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!resp.ok) throw new Error(`GitHub GET ${pathname} -> ${resp.status}`);
  return resp.json();
}

async function main() {
  if (!TOKEN) throw new Error('GITHUB_TOKEN requerido.');

  const prs = await gh(`repos/${REPO}/pulls?state=open&sort=updated&direction=asc&per_page=100`);
  const candidates = prs.filter((pr) => !pr.draft).slice(0, MAX_PRS);
  console.log(`PR Doctor sweep: ${candidates.length}/${prs.length} open PRs (max=${MAX_PRS}).`);

  let failures = 0;
  for (const pr of candidates) {
    console.log(`\n--- sweep #${pr.number} ${pr.head.sha.slice(0, 8)} ---`);
    const result = spawnSync(process.execPath, ['scripts/ci/pr-doctor.mjs', '--pr', String(pr.number)], {
      stdio: 'inherit',
      env: process.env,
    });
    if (result.status !== 0) {
      failures += 1;
      console.error(`#${pr.number}: doctor invocation failed; continuing sweep.`);
    }
  }

  if (failures) {
    console.error(`PR Doctor sweep completed with ${failures} invocation error(s).`);
    process.exitCode = 1;
  } else {
    console.log('PR Doctor sweep completed.');
  }
}

main().catch((error) => {
  console.error(`pr-doctor-sweep: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
