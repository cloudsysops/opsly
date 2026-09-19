#!/usr/bin/env node
/**
 * PR doctor — cuando un PR abierto tiene una falla REAL de CI (lint/build/
 * secret-scan/test-unit/test-integration, no production-change-window ni
 * opsly-independent-review, que ya tienen su propio manejo), despacha un
 * fix task a la cola real de agentes vía
 * POST {OPSLY_ORCHESTRATOR_URL}/api/local/prompt-submit — el mismo endpoint
 * que scripts/ops/github-agent-queue-submit.mjs, sin invocar la maquinaria
 * de workpacks gobernados (esto no vive bajo
 * docs/01-development/github-agent-queue/, es un submit directo).
 *
 * No fija el agente (agent: null) — el Orchestrator usa el registry externo
 * canónico + runtime health para seleccionar un agente dispatch-eligible y
 * recorrer sus fallbacks. Así el fix de un PR no depende de un agente
 * específico ni se encola a un runtime conocido como caído.
 *
 * Por qué corre en Tailscale efímero, no self-hosted: cloudsysops/opsly es
 * repo público (ver .github/workflows/github-agent-queue.yml).
 *
 * Idempotencia: antes de despachar, revisa si ya hay un comentario
 * "PR Doctor: fix dispatched for <sha corto>" en el PR — evita
 * redespachar en cada re-run del mismo push.
 *
 * Requiere:
 *   OPSLY_ORCHESTRATOR_URL — default http://100.120.151.91:3011 (interno, Tailscale)
 *   PLATFORM_ADMIN_TOKEN   — ya existe como secret del repo
 *   GITHUB_TOKEN           — para leer PR/check-runs y postear el comentario marcador
 *
 * Uso:
 *   node scripts/ci/pr-doctor.mjs --pr 1559 [--dry-run]
 */
'use strict';

import fs from 'node:fs/promises';
import { isIgnoredCheck } from './pr-triage.mjs';

const POLICY_PATH = new URL('../../config/pr-triage-policy.json', import.meta.url);
const REPO = process.env.OPSLY_GITHUB_REPO ?? 'cloudsysops/opsly';
const READ_TOKEN = (process.env.GITHUB_TOKEN ?? '').trim();
const ORCHESTRATOR_URL = (process.env.OPSLY_ORCHESTRATOR_URL ?? 'http://100.120.151.91:3011').replace(/\/$/, '');
const ADMIN_TOKEN = (process.env.PLATFORM_ADMIN_TOKEN ?? '').trim();
const TENANT_SLUG = process.env.OPSLY_DOCTOR_TENANT ?? 'platform';

// production-change-window y opsly-independent-review ya tienen su propio
// manejo (night-merge.yml / backend-independent-review.yml) — no duplicar.
let ignoredPatternsCache = null;

async function ignoredCheckPatterns() {
  if (ignoredPatternsCache) return ignoredPatternsCache;
  const policy = JSON.parse(await fs.readFile(POLICY_PATH, 'utf8'));
  const patterns = Array.isArray(policy?.ignored_check_patterns)
    ? policy.ignored_check_patterns.map(String)
    : [];
  ignoredPatternsCache = patterns;
  return patterns;
}
const CHECK_MARKER_PREFIX = 'PR Doctor: fix dispatched for';
const REVIEW_MARKER_PREFIX = 'PR Doctor: review fix dispatched for';

function parseArgs(argv) {
  const out = { dryRun: false, reviewBlocked: false, pr: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--dry-run') out.dryRun = true;
    else if (argv[i] === '--review-blocked') out.reviewBlocked = true;
    else if (argv[i] === '--pr') out.pr = Number(argv[++i]);
  }
  return out;
}

async function gh(pathname, { token, method = 'GET', body } = {}) {
  const resp = await fetch(`https://api.github.com/${pathname}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`GitHub API ${method} ${pathname} -> ${resp.status}: ${detail.slice(0, 500)}`);
  }
  return resp.status === 204 ? null : resp.json();
}

async function alreadyDispatched(pr, shortSha, token, markerPrefix) {
  const comments = await gh(`repos/${REPO}/issues/${pr.number}/comments?per_page=100`, { token });
  return comments.some((c) => (c.body ?? '').includes(`${markerPrefix} ${shortSha}`));
}

async function blockingReviews(pr, token) {
  const reviews = await gh(`repos/${REPO}/pulls/${pr.number}/reviews?per_page=100`, { token });
  const latestByUser = new Map();
  for (const review of reviews ?? []) {
    const login = review.user?.login;
    if (!login) continue;
    const previous = latestByUser.get(login);
    if (!previous || Date.parse(review.submitted_at || 0) >= Date.parse(previous.submitted_at || 0)) {
      latestByUser.set(login, review);
    }
  }
  return [...latestByUser.values()]
    .filter(
      (review) =>
        review.state === 'CHANGES_REQUESTED' &&
        review.commit_id === pr.head.sha &&
        ['github-actions[bot]', 'github-actions'].includes(review.user?.login)
    )
    .map((review) => ({
      name: `review:${review.user?.login ?? 'unknown'}`,
      details_url: review.html_url ?? pr.html_url,
      summary: String(review.body ?? '').slice(0, 2000),
    }));
}

async function failingChecks(pr, token) {
  const [combined, ignoredPatterns] = await Promise.all([
    gh(`repos/${REPO}/commits/${pr.head.sha}/check-runs?per_page=100`, { token }),
    ignoredCheckPatterns(),
  ]);
  return (combined.check_runs ?? [])
    .filter((c) => c.conclusion === 'failure' && !isIgnoredCheck(c.name, ignoredPatterns))
    .map((c) => ({
      name: c.name,
      details_url: c.details_url,
      summary: (c.output?.summary ?? '').slice(0, 1000),
    }));
}

async function dispatchFix(pr, failing, token, { reviewBlocked = false } = {}) {
  const mode = reviewBlocked ? 'review' : 'check';
  const requestId = `pr-doctor:${mode}:${pr.number}:${pr.head.sha.slice(0, 8)}`;
  const checkList = failing.map((c) => `- ${c.name}: ${c.details_url}${c.summary ? `\n  ${c.summary}` : ''}`).join('\n');
  const changedFiles = await gh(
    `repos/${REPO}/pulls/${pr.number}/files?per_page=100`,
    { token }
  );
  const affectedPaths = (Array.isArray(changedFiles) ? changedFiles : [])
    .map((file) => (typeof file?.filename === 'string' ? file.filename.trim() : ''))
    .filter(Boolean)
    .slice(0, 100);

  const payload = {
    tenant_slug: TENANT_SLUG,
    request_id: requestId,
    agent: null, // no fijar agente — que agent-task-core enrute al primero disponible
    agent_role: 'executor',
    goal: reviewBlocked
      ? `Resolver review blockers en PR #${pr.number} (${pr.title})`
      : `Arreglar falla de CI en PR #${pr.number} (${pr.title})`,
    max_steps: 8,
    prompt_content: [
      `PR #${pr.number}: ${pr.title}`,
      `Rama: ${pr.head.ref} (NO crear rama nueva — trabajar sobre esta misma).`,
      `Commit actual: ${pr.head.sha}`,
      '',
      reviewBlocked ? 'Review blockers exact-head:' : 'Checks fallando ahora mismo:',
      checkList,
      '',
      reviewBlocked
        ? 'Instrucciones: trabaja únicamente los CHANGES_REQUESTED exact-head listados arriba.'
        : 'Instrucciones: haz checkout de la rama y reproduce únicamente los checks técnicos listados arriba.',
      'Identifica la causa real, corrígela, valida localmente y haz commit + push sobre la misma rama.',
      'No toques production-change-window ni debilites opsly-independent-review.',
    ].join('\n'),
    context: {
      source: 'pr_doctor',
      workpack_id: requestId,
      workstream: `pr-doctor/${REPO}`,
      conflict_key: `pr-reconcile/pr-${pr.number}`,
      semantic_scope: `pr-reconcile/pr-${pr.number}/head-${pr.head.sha}`,
      requires_pr: true,
      pr_number: pr.number,
      pr_branch: pr.head.ref,
      pr_head_sha: pr.head.sha,
      failing_checks: failing.map((c) => c.name),
      affected_paths: affectedPaths,
      github: {
        repository: REPO,
        run_id: process.env.GITHUB_RUN_ID ?? null,
        workflow: process.env.GITHUB_WORKFLOW ?? null,
      },
    },
  };

  const resp = await fetch(`${ORCHESTRATOR_URL}/api/local/prompt-submit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    if (
      resp.status === 503 &&
      (detail.includes('NO_DISPATCH_ELIGIBLE_AGENT') || detail.includes('runtime_unknown'))
    ) {
      return {
        deferred: true,
        reason: 'runtime_unavailable',
        detail: detail.slice(0, 500),
      };
    }
    throw new Error(`prompt-submit ${resp.status}: ${detail.slice(0, 500)}`);
  }
  const result = await resp.json();

  await gh(`repos/${REPO}/issues/${pr.number}/comments`, {
    token,
    method: 'POST',
    body: {
      body: [
        `${reviewBlocked ? REVIEW_MARKER_PREFIX : CHECK_MARKER_PREFIX} ${pr.head.sha.slice(0, 8)}`,
        '',
        `Checks: ${failing.map((c) => c.name).join(', ')}`,
        `request_id: \`${requestId}\``,
      ].join('\n'),
    },
  });

  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.pr) throw new Error('Usage: pr-doctor.mjs --pr <number> [--dry-run]');
  if (!READ_TOKEN) throw new Error('GITHUB_TOKEN requerido para leer el PR.');

  const pr = await gh(`repos/${REPO}/pulls/${args.pr}`, { token: READ_TOKEN });
  if (pr.draft) {
    console.log(`#${pr.number} draft — se omite.`);
    return;
  }

  const failing = args.reviewBlocked
    ? await blockingReviews(pr, READ_TOKEN)
    : await failingChecks(pr, READ_TOKEN);
  if (failing.length === 0) {
    console.log(
      args.reviewBlocked
        ? `#${pr.number} sin CHANGES_REQUESTED exact-head — nada que reparar.`
        : `#${pr.number} sin fallas técnicas reales — nada que hacer.`
    );
    return;
  }

  const shortSha = pr.head.sha.slice(0, 8);
  const markerPrefix = args.reviewBlocked ? REVIEW_MARKER_PREFIX : CHECK_MARKER_PREFIX;
  if (await alreadyDispatched(pr, shortSha, READ_TOKEN, markerPrefix)) {
    console.log(`#${pr.number} ya tiene reparación despachada para ${shortSha} — se omite.`);
    return;
  }

  console.log(
    `#${pr.number} ${args.reviewBlocked ? 'review blocker' : 'falla real'}: ${failing.map((c) => c.name).join(', ')}`
  );

  if (args.dryRun) {
    console.log('[dry-run] no se despacha nada.');
    return;
  }
  if (!ADMIN_TOKEN) {
    console.log('PLATFORM_ADMIN_TOKEN no configurado — no-op (nada se despacha).');
    return;
  }

  const result = await dispatchFix(pr, failing, READ_TOKEN, { reviewBlocked: args.reviewBlocked });
  if (result?.deferred === true) {
    console.log(
      `#${pr.number} DEFERRED_RUNTIME — no hay worker elegible todavía; se reintentará en el próximo reconciliation sweep.`
    );
    return;
  }
  console.log(`#${pr.number} fix despachado:`, JSON.stringify(result).slice(0, 300));
}

main().catch((error) => {
  console.error(`pr-doctor: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
