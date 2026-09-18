#!/usr/bin/env node
/**
 * Opsly Open Review Agent — usa el orchestrator gobernado para ejecutar una
 * review read-only en local_opencode -> PC Gamer -> Ollama/Qwen local y someter
 * una PR review real, satisfaciendo
 * el mismo gate que scripts/ci/check-independent-review.mjs evalúa en CI
 * (.github/workflows/trusted-independent-review.yml).
 *
 * Este reviewer no usa Codex, Copilot, OpenAI, Anthropic ni otro fallback cloud.
 * Encola una tarea read-only explícita a `local_opencode`; el PC Gamer ejecuta
 * OpenCode con un modelo Ollama local. La review solo es aceptada si la evidencia
 * terminal reporta un modelo `ollama/qwen*`. Sin worker/Qwen local falla cerrado.
 *
 * Dos formas de correr esto (misma lógica, distinta identidad de posteo):
 *
 *   A. GitHub Actions (.github/workflows/backend-independent-review.yml) —
 *      ubuntu-latest, se une a Tailscale efímeramente para alcanzar el
 *      orchestrator interno y postea con el GITHUB_TOKEN ambiental.
 *
 *   B. Cron Mac/VPS, con OPSLY_REVIEW_BOT_TOKEN — PAT de una cuenta
 *      colaboradora del repo distinta al autor de los PRs.
 *
 * Requiere:
 *   OPSLY_REVIEW_BOT_TOKEN | GITHUB_TOKEN — identidad de posteo.
 *   OPSLY_ORCHESTRATOR_URL — default http://100.120.151.91:3011.
 *   PLATFORM_ADMIN_TOKEN — auth del submit/status gobernado.
 *   OPSLY_GITHUB_REPO — default cloudsysops/opsly.
 */
'use strict';

import { evaluateIndependentReview } from './check-independent-review.mjs';
import { buildFileAwareReviewContext } from './backend-review-context.mjs';

const REPO = process.env.OPSLY_GITHUB_REPO ?? 'cloudsysops/opsly';
const POST_TOKEN =
  (process.env.OPSLY_REVIEW_BOT_TOKEN ?? '').trim() || (process.env.GITHUB_TOKEN ?? '').trim();
const READ_TOKEN = POST_TOKEN;
const ORCHESTRATOR_URL = (
  process.env.OPSLY_ORCHESTRATOR_URL ?? 'http://100.120.151.91:3011'
).replace(/\/$/, '');
const PLATFORM_ADMIN_TOKEN = (process.env.PLATFORM_ADMIN_TOKEN ?? '').trim();
const REVIEW_POLL_SECONDS = Math.max(
  30,
  Math.min(Number(process.env.OPSLY_REVIEW_POLL_SECONDS ?? 360), 900)
);

const CLEAN_PHRASE = "Open-Source Review: Didn't find any major issues.";
const REVIEWER_NAME = 'Opsly Open Review Agent';

function parseArgs(argv) {
  const out = { dryRun: false, pr: null, limit: 5 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--pr') out.pr = Number(argv[++i]);
    else if (arg === '--limit') out.limit = Number(argv[++i]);
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

async function fetchAll(endpoint, token) {
  const results = [];
  for (let page = 1; page <= 20; page += 1) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const items = await gh(`${endpoint}${sep}per_page=100&page=${page}`, { token });
    if (!Array.isArray(items)) throw new Error(`Expected array from ${endpoint}`);
    results.push(...items);
    if (items.length < 100) break;
  }
  return results;
}

async function listOpenPRs(token) {
  return fetchAll(`repos/${REPO}/pulls?state=open`, token);
}

async function alreadyReviewed(pr, token) {
  const [reviews, reviewComments, issueComments] = await Promise.all([
    fetchAll(`repos/${REPO}/pulls/${pr.number}/reviews`, token),
    fetchAll(`repos/${REPO}/pulls/${pr.number}/comments`, token),
    fetchAll(`repos/${REPO}/issues/${pr.number}/comments`, token),
  ]);
  return evaluateIndependentReview({
    reviews,
    reviewComments,
    issueComments,
    headSha: pr.head.sha,
    author: pr.user.login,
  });
}

async function fetchReviewContext(pr, token) {
  const files = await fetchAll(`repos/${REPO}/pulls/${pr.number}/files`, token);
  return buildFileAwareReviewContext(files);
}

async function orchestratorRequest(pathname, init = {}) {
  if (!PLATFORM_ADMIN_TOKEN) {
    throw new Error('PLATFORM_ADMIN_TOKEN is required for governed local review');
  }
  const response = await fetch(`${ORCHESTRATOR_URL}${pathname}`, {
    ...init,
    headers: {
      authorization: `Bearer ${PLATFORM_ADMIN_TOKEN}`,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
  const raw = await response.text();
  let body = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = { raw };
  }
  return { response, body };
}

function deepString(value, keys, depth = 0) {
  if (depth > 8 || value === null || value === undefined) return null;
  if (typeof value === 'string') return null;
  if (typeof value !== 'object') return null;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  for (const candidate of Object.values(value)) {
    const found = deepString(candidate, keys, depth + 1);
    if (found) return found;
  }
  return null;
}

function deepBoolean(value, key, depth = 0) {
  if (depth > 8 || value === null || value === undefined || typeof value !== 'object') return null;
  if (typeof value[key] === 'boolean') return value[key];
  for (const candidate of Object.values(value)) {
    const found = deepBoolean(candidate, key, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

async function reviewWithLocalWorker({ pr, diff, failingChecks }) {
  const system = [
    `Eres ${REVIEWER_NAME}, el revisor independiente open-source de Opsly.`,
    'Esta es una tarea READ-ONLY. No edites archivos, no hagas commits y no cambies el worktree.',
    'Revisa el contexto de cambios de un PR generado por un agente autónomo.',
    'El contexto está separado por archivo y puede contener marcadores de omisión del centro',
    'de un patch para respetar el presupuesto. Esos marcadores describen el prompt,',
    'NO son código del repositorio y NO deben reportarse como P0/P1/P2. Evalúa solo defectos',
    'demostrables en el código visible; si falta evidencia para una conclusión, no inventes el defecto.',
    'Responde EXACTAMENTE en uno de estos dos formatos, sin nada más:',
    `1) Si no hay problemas bloqueantes: la línea literal "${CLEAN_PHRASE}"`,
    '2) Si hay problemas: una lista con severidad "P0 <hallazgo>", "P1 <hallazgo>" o',
    '   "P2 <hallazgo>" por línea, citando archivo:línea cuando sea posible.',
    'P0 = bug de correctitud, seguridad o rompe producción. P1 = importante pero no',
    'bloqueante en sí. P2 = menor/estilo. No inventes hallazgos; si no encuentras nada',
    'real, usa el formato 1.',
  ].join('\n');

  const prompt = [
    system,
    '',
    `PR #${pr.number}: ${pr.title}`,
    failingChecks.length
      ? `Checks de CI en rojo ahora mismo: ${failingChecks.join(', ')}`
      : 'Checks de CI: sin fallas registradas al momento de revisar.',
    '',
    '--- FILE-AWARE REVIEW CONTEXT ---',
    diff,
  ].join('\n');

  const requestId = `open-review-${pr.number}-${pr.head.sha.slice(0, 12)}`;
  const payload = {
    tenant_slug: 'local',
    request_id: requestId,
    idempotency_key: requestId,
    agent: 'local_opencode',
    agent_role: 'review',
    max_steps: 4,
    goal: `Independent open-source review for PR #${pr.number}`,
    prompt_content: prompt,
    context: {
      source: 'open-source-independent-review',
      review_pr: pr.number,
      review_head_sha: pr.head.sha,
      workstream: 'github-independent-review',
      conflict_key: `review:${REPO}:${pr.number}:${pr.head.sha}`,
      semantic_scope: `review:${REPO}:${pr.number}:${pr.head.sha}`,
      requires_pr: false,
      production_deploy: false,
      paid_infra_required: false,
      cost_class: 'free',
    },
  };

  const submit = await orchestratorRequest('/api/local/prompt-submit', {
    method: 'POST',
    headers: { 'x-autonomy-approved': 'true' },
    body: JSON.stringify(payload),
  });

  let jobId = submit.body?.job_id ? String(submit.body.job_id) : '';
  if (!submit.response.ok) {
    const decision = String(submit.body?.dispatch_decision ?? '');
    if (
      submit.response.status === 409 &&
      (decision === 'ALREADY_DONE' || decision === 'JOIN_EXISTING') &&
      submit.body?.existing_job_id
    ) {
      jobId = String(submit.body.existing_job_id);
    } else {
      throw new Error(
        `Open-source reviewer submit ${submit.response.status}: ${JSON.stringify(submit.body).slice(0, 300)}`
      );
    }
  }
  if (!jobId) {
    throw new Error('Open-source reviewer did not receive a durable local job id');
  }

  const deadline = Date.now() + REVIEW_POLL_SECONDS * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const status = await orchestratorRequest(`/api/job-status/${encodeURIComponent(jobId)}`);
    if (status.response.status === 404) continue;
    if (!status.response.ok) {
      throw new Error(`Open-source reviewer status HTTP ${status.response.status}`);
    }

    const state = String(status.body?.status ?? status.body?.state ?? '').toLowerCase();
    if (['failed', 'error', 'cancelled'].includes(state)) {
      throw new Error(`Open-source reviewer local job ended ${state}: ${JSON.stringify(status.body).slice(0, 300)}`);
    }
    if (!['completed', 'done', 'success'].includes(state)) continue;

    const success = deepBoolean(status.body, 'success');
    if (success === false) {
      throw new Error(`Open-source reviewer local result reported success=false: ${JSON.stringify(status.body).slice(0, 300)}`);
    }
    const verdict = deepString(status.body, [
      'result',
      'response_content',
      'content',
      'output',
      'text',
    ]);
    const modelUsed = deepString(status.body, ['model', 'model_used']);
    const workerId = deepString(status.body, ['workerId', 'worker_id']);

    if (!verdict) throw new Error('Open-source reviewer local job returned no verdict text');
    if (!modelUsed || !/^ollama\/qwen/i.test(modelUsed)) {
      throw new Error(`Open-source reviewer requires local Qwen evidence; got model=${modelUsed ?? 'unknown'}`);
    }
    if (!workerId) {
      throw new Error('Open-source reviewer requires worker identity evidence');
    }
    return { verdict: verdict.trim(), modelUsed, workerId };
  }

  throw new Error(`Open-source reviewer local job timed out after ${REVIEW_POLL_SECONDS}s: ${jobId}`);
}

function isClean(verdict) {
  return verdict.toLowerCase().includes(CLEAN_PHRASE.toLowerCase());
}

async function submitReview(pr, verdict, modelUsed, workerId, token) {
  const clean = isClean(verdict);
  const evidence = [
    `Reviewed commit: \`${pr.head.sha}\``,
    `Reviewer: ${REVIEWER_NAME}`,
    `Runtime: local_opencode -> Ollama / \`${modelUsed}\``,
    `Worker: \`${workerId}\``,
    'Cloud fallback: disabled',
    'Provider cost: $0',
  ].join('\n');
  const body = clean
    ? `${CLEAN_PHRASE}\n\n${evidence}`
    : `${verdict}\n\n${evidence}`;
  await gh(`repos/${REPO}/pulls/${pr.number}/reviews`, {
    token,
    method: 'POST',
    body: {
      commit_id: pr.head.sha,
      body,
      event: clean ? 'APPROVE' : 'REQUEST_CHANGES',
    },
  });

  await gh(`repos/${REPO}/statuses/${pr.head.sha}`, {
    token,
    method: 'POST',
    body: {
      state: clean ? 'success' : 'failure',
      context: 'opsly-independent-review',
      description: clean
        ? 'Open-source independent review verified for final head SHA'
        : 'Open-source independent review has blocking findings',
    },
  });
}

async function failingCheckNames(pr, token) {
  try {
    const combined = await gh(`repos/${REPO}/commits/${pr.head.sha}/check-runs`, { token });
    return (combined.check_runs ?? [])
      .filter((c) => c.conclusion === 'failure')
      .map((c) => c.name);
  } catch {
    return [];
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!READ_TOKEN) {
    console.error(
      [
        'open-source-independent-review: no hay identidad para postear la review. No-op.',
        '',
        'Dos formas de darle una:',
        '  A. GitHub Actions mediante .github/workflows/backend-independent-review.yml.',
        '  B. Cron Mac/VPS con OPSLY_REVIEW_BOT_TOKEN de una cuenta colaboradora.',
        '',
      ].join('\n')
    );
    return;
  }

  const prs = args.pr
    ? [await gh(`repos/${REPO}/pulls/${args.pr}`, { token: READ_TOKEN })]
    : await listOpenPRs(READ_TOKEN);

  let acted = 0;
  for (const pr of prs) {
    if (pr.draft) {
      console.log(`#${pr.number} draft — se omite.`);
      continue;
    }
    const decision = await alreadyReviewed(pr, READ_TOKEN);
    if (decision.ok) {
      console.log(`#${pr.number} ya satisface independent-review (${decision.reason}) — se omite.`);
      continue;
    }
    if (!args.pr && acted >= args.limit) {
      console.log(`Límite de ${args.limit} PRs por corrida alcanzado — el resto queda para la próxima.`);
      break;
    }

    console.log(`#${pr.number} (${pr.title}) necesita open-source review — reason=${decision.reason}`);
    let reviewResult;
    try {
      const [diff, failing] = await Promise.all([
        fetchReviewContext(pr, READ_TOKEN),
        failingCheckNames(pr, READ_TOKEN),
      ]);
      reviewResult = await reviewWithLocalWorker({ pr, diff, failingChecks: failing });
    } catch (error) {
      console.error(`#${pr.number} error generando open-source review: ${error.message}`);
      process.exitCode = 1;
      continue;
    }

    const { verdict, modelUsed, workerId } = reviewResult;
    console.log(`#${pr.number} veredicto (${modelUsed}):\n${verdict}\n`);

    if (args.dryRun) {
      console.log(`#${pr.number} [dry-run] no se postea nada.`);
    } else {
      await submitReview(pr, verdict, modelUsed, workerId, POST_TOKEN);
      console.log(`#${pr.number} review sometida (${isClean(verdict) ? 'APPROVE' : 'REQUEST_CHANGES'}).`);
    }
    acted += 1;
  }
}

main().catch((error) => {
  console.error(`open-source-independent-review: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
