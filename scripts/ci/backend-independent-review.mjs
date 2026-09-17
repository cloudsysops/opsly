#!/usr/bin/env node
/**
 * Opsly Open Review Agent — usa nuestro LLM Gateway con una ruta Ollama local
 * explícita para revisar PRs abiertos y someter una PR review real, satisfaciendo
 * el mismo gate que scripts/ci/check-independent-review.mjs evalúa en CI
 * (.github/workflows/trusted-independent-review.yml).
 *
 * Este reviewer no usa Codex, Copilot, OpenAI, Anthropic ni otro fallback cloud.
 * `provider_hint=ollama-code` llama directamente a `codellama_local`; si el
 * provider local no está disponible, la revisión falla cerrada.
 *
 * Dos formas de correr esto (misma lógica, distinta identidad de posteo):
 *
 *   A. GitHub Actions (.github/workflows/backend-independent-review.yml) —
 *      ubuntu-latest, se une a Tailscale efímeramente para alcanzar el LLM
 *      Gateway interno y postea con el GITHUB_TOKEN ambiental.
 *
 *   B. Cron Mac/VPS, con OPSLY_REVIEW_BOT_TOKEN — PAT de una cuenta
 *      colaboradora del repo distinta al autor de los PRs.
 *
 * Requiere:
 *   OPSLY_REVIEW_BOT_TOKEN | GITHUB_TOKEN — identidad de posteo.
 *   LLM_GATEWAY_URL — default http://llm-gateway:3010.
 *   OPSLY_GITHUB_REPO — default cloudsysops/opsly.
 *   OPSLY_REVIEW_TENANT — default "opsly-ci-open-source-review"; este tenant
 *      está fijado a perfil `free-always` en el Gateway.
 */
'use strict';

import { evaluateIndependentReview } from './check-independent-review.mjs';
import { buildFileAwareReviewContext } from './backend-review-context.mjs';

const REPO = process.env.OPSLY_GITHUB_REPO ?? 'cloudsysops/opsly';
const POST_TOKEN =
  (process.env.OPSLY_REVIEW_BOT_TOKEN ?? '').trim() || (process.env.GITHUB_TOKEN ?? '').trim();
const READ_TOKEN = POST_TOKEN;
const GATEWAY_URL = process.env.LLM_GATEWAY_URL ?? 'http://llm-gateway:3010';
const TENANT_SLUG = process.env.OPSLY_REVIEW_TENANT ?? 'opsly-ci-open-source-review';

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

async function reviewWithGateway({ pr, diff, failingChecks }) {
  const system = [
    `Eres ${REVIEWER_NAME}, el revisor independiente open-source de Opsly.`,
    'Revisa el contexto de cambios de un PR generado por un agente autónomo.',
    'El contexto está separado por archivo y puede contener marcadores de omisión del centro',
    'de un patch para respetar el presupuesto del gateway. Esos marcadores describen el prompt,',
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
    `PR #${pr.number}: ${pr.title}`,
    failingChecks.length
      ? `Checks de CI en rojo ahora mismo: ${failingChecks.join(', ')}`
      : 'Checks de CI: sin fallas registradas al momento de revisar.',
    '',
    '--- FILE-AWARE REVIEW CONTEXT ---',
    diff,
  ].join('\n');

  const resp = await fetch(`${GATEWAY_URL}/v1/text`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      tenant_slug: TENANT_SLUG,
      prompt,
      system,
      task_type: 'review',
      provider_hint: 'ollama-code',
      feature: 'independent_open_source_review',
      request_id: `open-source-independent-review:${pr.number}:${pr.head.sha.slice(0, 8)}`,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '(sin body)');
    throw new Error(`Open-source reviewer gateway ${resp.status}: ${body.slice(0, 300)}`);
  }
  const data = await resp.json();
  if (!data.content) throw new Error('Open-source reviewer no devolvió contenido');
  const reportedCost = Number(data.llm?.cost_usd);
  if (!Number.isFinite(reportedCost) || reportedCost !== 0) {
    throw new Error(`Open-source reviewer reported unexpected provider cost: ${data.llm?.cost_usd}`);
  }
  return {
    verdict: String(data.content).trim(),
    modelUsed: String(data.llm?.model_used ?? 'unknown-local-model'),
  };
}

function isClean(verdict) {
  return verdict.toLowerCase().includes(CLEAN_PHRASE.toLowerCase());
}

async function submitReview(pr, verdict, modelUsed, token) {
  const clean = isClean(verdict);
  const evidence = [
    `Reviewed commit: \`${pr.head.sha}\``,
    `Reviewer: ${REVIEWER_NAME}`,
    `Runtime: Ollama local / \`${modelUsed}\``,
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
      reviewResult = await reviewWithGateway({ pr, diff, failingChecks: failing });
    } catch (error) {
      console.error(`#${pr.number} error generando open-source review: ${error.message}`);
      process.exitCode = 1;
      continue;
    }

    const { verdict, modelUsed } = reviewResult;
    console.log(`#${pr.number} veredicto (${modelUsed}):\n${verdict}\n`);

    if (args.dryRun) {
      console.log(`#${pr.number} [dry-run] no se postea nada.`);
    } else {
      await submitReview(pr, verdict, modelUsed, POST_TOKEN);
      console.log(`#${pr.number} review sometida (${isClean(verdict) ? 'APPROVE' : 'REQUEST_CHANGES'}).`);
    }
    acted += 1;
  }
}

main().catch((error) => {
  console.error(`open-source-independent-review: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
