#!/usr/bin/env node
/**
 * Backend independent review — usa nuestro LLM Gateway (no Copilot/Codex externos)
 * para revisar PRs abiertos y someter una PR review real, satisfaciendo el mismo
 * gate que scripts/ci/check-independent-review.mjs evalúa en CI
 * (.github/workflows/trusted-independent-review.yml).
 *
 * Dos formas de correr esto (misma lógica, distinta identidad de posteo):
 *
 *   A. GitHub Actions (.github/workflows/backend-independent-review.yml) —
 *      ubuntu-latest (no self-hosted: cloudsysops/opsly es público, ver
 *      github-agent-queue.yml), se une a Tailscale efímeramente para alcanzar
 *      el LLM Gateway interno, y postea con el GITHUB_TOKEN ambiental
 *      (github-actions[bot], whitelisteado en INDEPENDENT_REVIEW_BOTS dentro
 *      de trusted-independent-review.yml). No requiere ninguna cuenta nueva.
 *
 *   B. Cron Mac/VPS (igual que scripts/ci/night-merge-and-verify.sh), con
 *      OPSLY_REVIEW_BOT_TOKEN — PAT de una cuenta colaboradora del repo
 *      distinta al autor de los PRs. Útil si se quiere desacoplar de Actions.
 *
 * check-independent-review.mjs acepta cualquier review de un colaborador real
 * (author_association COLLABORATOR/MEMBER/OWNER) o de un bot en
 * INDEPENDENT_REVIEW_BOTS — nunca del propio autor del PR.
 *
 * Requiere:
 *   OPSLY_REVIEW_BOT_TOKEN | GITHUB_TOKEN  — identidad de posteo (ver A/B arriba).
 *                              Sin ninguno de los dos: no-op con instrucciones.
 *   LLM_GATEWAY_URL         — default http://llm-gateway:3010 (interno, Tailscale;
 *                              el workflow A lo fija a http://100.120.151.91:3010).
 *                              Mismo contrato que lib/content-studio/src/llm/client.ts
 *                              (GatewayClient): POST /v1/chat.
 *   OPSLY_GITHUB_REPO       — default cloudsysops/opsly
 *   OPSLY_REVIEW_TENANT     — tenant_slug para el gateway, default "platform"
 *
 * Uso:
 *   node scripts/ci/backend-independent-review.mjs --dry-run           # no escribe nada, solo lee
 *   node scripts/ci/backend-independent-review.mjs --pr 1553 --dry-run # un solo PR
 *   node scripts/ci/backend-independent-review.mjs --limit 5           # revisa y postea (máx 5 PRs)
 */
'use strict';

import { evaluateIndependentReview } from './check-independent-review.mjs';

const REPO = process.env.OPSLY_GITHUB_REPO ?? 'cloudsysops/opsly';
// Dos identidades posibles para postear la review (nunca el autor del PR):
//   1. OPSLY_REVIEW_BOT_TOKEN — cuenta colaboradora dedicada (uso Mac/VPS cron).
//   2. GITHUB_TOKEN ambiental de Actions (github-actions[bot]) — uso
//      .github/workflows/backend-independent-review.yml; requiere que
//      github-actions[bot] esté en INDEPENDENT_REVIEW_BOTS de
//      trusted-independent-review.yml (ya lo está — ver ese archivo).
const POST_TOKEN =
  (process.env.OPSLY_REVIEW_BOT_TOKEN ?? '').trim() || (process.env.GITHUB_TOKEN ?? '').trim();
const READ_TOKEN = POST_TOKEN;
const GATEWAY_URL = process.env.LLM_GATEWAY_URL ?? 'http://llm-gateway:3010';
const TENANT_SLUG = process.env.OPSLY_REVIEW_TENANT ?? 'platform';

const CLEAN_PHRASE = "Codex Review: Didn't find any major issues.";

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

async function fetchDiff(pr, token) {
  const resp = await fetch(`https://api.github.com/repos/${REPO}/pulls/${pr.number}`, {
    headers: {
      Accept: 'application/vnd.github.v3.diff',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!resp.ok) throw new Error(`diff fetch failed: ${resp.status}`);
  const text = await resp.text();
  // No mandar diffs gigantes al gateway — sesgo hacia contexto útil, no todo.
  return text.length > 60_000 ? `${text.slice(0, 60_000)}\n\n[...diff truncado...]` : text;
}

/**
 * Un solo call al LLM Gateway. Contrato real (no el de
 * lib/content-studio/src/llm/client.ts, que apunta a /v1/chat — esa ruta no
 * existe en el server; ver apps/llm-gateway/src/health-server.ts):
 * POST /v1/text { tenant_slug, prompt, system, task_type, request_id, feature }
 * → { content, llm: {...}, request_id }
 * (apps/llm-gateway/src/text-completion-route.ts). Nota: esta ruta fuerza
 * routing_bias=cost / model=cheap del lado del servidor — no hay forma de
 * pedir un modelo específico por este endpoint hoy.
 */
async function reviewWithGateway({ pr, diff, failingChecks }) {
  const system = [
    'Eres el revisor independiente de Opsly (monorepo cloudsysops/opsly).',
    'Revisa el diff de un PR generado por un agente autónomo.',
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
    '--- DIFF ---',
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
      skip_repo_context: true,
      feature: 'independent_review',
      request_id: `backend-independent-review:${pr.number}:${pr.head.sha.slice(0, 8)}`,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '(sin body)');
    throw new Error(`LLM Gateway ${resp.status}: ${body.slice(0, 300)}`);
  }
  const data = await resp.json();
  if (!data.content) throw new Error('LLM Gateway no devolvió contenido');
  return String(data.content).trim();
}

function isClean(verdict) {
  return verdict.toLowerCase().includes(CLEAN_PHRASE.toLowerCase());
}

async function submitReview(pr, verdict, token) {
  const clean = isClean(verdict);
  const body = clean
    ? `${CLEAN_PHRASE}\n\nReviewed commit: \`${pr.head.sha}\``
    : `${verdict}\n\nReviewed commit: \`${pr.head.sha}\``;
  return gh(`repos/${REPO}/pulls/${pr.number}/reviews`, {
    token,
    method: 'POST',
    body: {
      commit_id: pr.head.sha,
      body,
      event: clean ? 'APPROVE' : 'REQUEST_CHANGES',
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
        'backend-independent-review: no hay identidad para postear la review. No-op.',
        '',
        'Dos formas de darle una (elige una, no hace falta ambas):',
        '  A. Vía CI (recomendado, ya wireado): correr desde',
        '     .github/workflows/backend-independent-review.yml — usa el GITHUB_TOKEN',
        '     ambiental (github-actions[bot]), ya whitelisteado en',
        '     trusted-independent-review.yml (INDEPENDENT_REVIEW_BOTS). No requiere',
        '     crear ninguna cuenta nueva.',
        '  B. Vía cron Mac/VPS: exportar OPSLY_REVIEW_BOT_TOKEN con el PAT de una',
        '     cuenta colaboradora del repo, distinta al autor de los PRs.',
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

    console.log(`#${pr.number} (${pr.title}) necesita review — reason=${decision.reason}`);
    let verdict;
    try {
      const [diff, failing] = await Promise.all([
        fetchDiff(pr, READ_TOKEN),
        failingCheckNames(pr, READ_TOKEN),
      ]);
      verdict = await reviewWithGateway({ pr, diff, failingChecks: failing });
    } catch (error) {
      console.error(`#${pr.number} error generando review: ${error.message}`);
      // No dejar que CI reporte "success" cuando en realidad no se posteó nada.
      process.exitCode = 1;
      continue;
    }

    console.log(`#${pr.number} veredicto:\n${verdict}\n`);

    if (args.dryRun) {
      console.log(`#${pr.number} [dry-run] no se postea nada.`);
    } else {
      await submitReview(pr, verdict, POST_TOKEN);
      console.log(`#${pr.number} review sometida (${isClean(verdict) ? 'APPROVE' : 'REQUEST_CHANGES'}).`);
    }
    acted += 1;
  }
}

main().catch((error) => {
  console.error(`backend-independent-review: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
