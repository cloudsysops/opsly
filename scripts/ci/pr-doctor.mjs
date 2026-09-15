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
 * No fija el agente (agent: null) — que agent-task-core enrute al primer
 * agente capaz disponible (mismo principio que
 * apps/orchestrator/src/agents/executor-router.ts: cursor → claude-code →
 * shell). Así el fix de un PR no depende de que un agente específico esté
 * libre.
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

const REPO = process.env.OPSLY_GITHUB_REPO ?? 'cloudsysops/opsly';
const READ_TOKEN = (process.env.GITHUB_TOKEN ?? '').trim();
const ORCHESTRATOR_URL = (process.env.OPSLY_ORCHESTRATOR_URL ?? 'http://100.120.151.91:3011').replace(/\/$/, '');
const ADMIN_TOKEN = (process.env.PLATFORM_ADMIN_TOKEN ?? '').trim();
const TENANT_SLUG = process.env.OPSLY_DOCTOR_TENANT ?? 'platform';

// production-change-window y opsly-independent-review ya tienen su propio
// manejo (night-merge.yml / backend-independent-review.yml) — no duplicar.
const IGNORED_CHECKS = new Set(['production-change-window', 'opsly-independent-review', 'independent-review']);
const MARKER_PREFIX = 'PR Doctor: fix dispatched for';

function parseArgs(argv) {
  const out = { dryRun: false, pr: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--dry-run') out.dryRun = true;
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

async function alreadyDispatched(pr, shortSha, token) {
  const comments = await gh(`repos/${REPO}/issues/${pr.number}/comments?per_page=100`, { token });
  return comments.some((c) => (c.body ?? '').includes(`${MARKER_PREFIX} ${shortSha}`));
}

async function failingChecks(pr, token) {
  const combined = await gh(`repos/${REPO}/commits/${pr.head.sha}/check-runs?per_page=100`, { token });
  return (combined.check_runs ?? [])
    .filter((c) => c.conclusion === 'failure' && !IGNORED_CHECKS.has(c.name))
    .map((c) => ({
      name: c.name,
      details_url: c.details_url,
      summary: (c.output?.summary ?? '').slice(0, 1000),
    }));
}

async function dispatchFix(pr, failing, token) {
  const requestId = `pr-doctor:${pr.number}:${pr.head.sha.slice(0, 8)}`;
  const checkList = failing.map((c) => `- ${c.name}: ${c.details_url}${c.summary ? `\n  ${c.summary}` : ''}`).join('\n');

  const payload = {
    tenant_slug: TENANT_SLUG,
    request_id: requestId,
    agent: null, // no fijar agente — que agent-task-core enrute al primero disponible
    agent_role: 'executor',
    goal: `Arreglar falla de CI en PR #${pr.number} (${pr.title})`,
    max_steps: 8,
    prompt_content: [
      `PR #${pr.number}: ${pr.title}`,
      `Rama: ${pr.head.ref} (NO crear rama nueva — trabajar sobre esta misma).`,
      `Commit actual: ${pr.head.sha}`,
      '',
      'Checks fallando ahora mismo:',
      checkList,
      '',
      'Instrucciones: haz checkout de la rama, corre el/los check(s) que fallan',
      'localmente, identifica la causa real, corrígela, y haz commit + push',
      'sobre la misma rama. No toques la lógica de production-change-window',
      'ni opsly-independent-review — esos se manejan aparte.',
    ].join('\n'),
    context: {
      source: 'pr_doctor',
      pr_number: pr.number,
      pr_branch: pr.head.ref,
      failing_checks: failing.map((c) => c.name),
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
    throw new Error(`prompt-submit ${resp.status}: ${detail.slice(0, 500)}`);
  }
  const result = await resp.json();

  await gh(`repos/${REPO}/issues/${pr.number}/comments`, {
    token,
    method: 'POST',
    body: {
      body: [
        `${MARKER_PREFIX} ${pr.head.sha.slice(0, 8)}`,
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

  const failing = await failingChecks(pr, READ_TOKEN);
  if (failing.length === 0) {
    console.log(`#${pr.number} sin fallas reales (fuera de production-change-window/independent-review) — nada que hacer.`);
    return;
  }

  const shortSha = pr.head.sha.slice(0, 8);
  if (await alreadyDispatched(pr, shortSha, READ_TOKEN)) {
    console.log(`#${pr.number} ya tiene un fix despachado para ${shortSha} — se omite (evita redespacho).`);
    return;
  }

  console.log(`#${pr.number} falla real en: ${failing.map((c) => c.name).join(', ')}`);

  if (args.dryRun) {
    console.log('[dry-run] no se despacha nada.');
    return;
  }
  if (!ADMIN_TOKEN) {
    console.log('PLATFORM_ADMIN_TOKEN no configurado — no-op (nada se despacha).');
    return;
  }

  const result = await dispatchFix(pr, failing, READ_TOKEN);
  console.log(`#${pr.number} fix despachado:`, JSON.stringify(result).slice(0, 300));
}

main().catch((error) => {
  console.error(`pr-doctor: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
