#!/usr/bin/env node
/**
 * Unattended night release — policy engine.
 * Approval is of an immutable Release Candidate SHA, never HEAD/main.
 *
 * Usage:
 *   node scripts/ops/release-candidate.mjs --revalidate [--evidence-file e.json] [--json]
 *   node scripts/ops/release-candidate.mjs --select --product peskids
 *   node scripts/ops/release-candidate.mjs --verify-prod --expected-sha SHA
 *   node scripts/ops/release-candidate.mjs --morning-report
 */
'use strict';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_REGISTRY = join(ROOT, 'config/release-candidates.json');
const TIME_ZONE = 'America/Bogota';
const WINDOW_START_HOUR = 22;
const WINDOW_END_HOUR = 6;
const AUTONOMOUS_RISKS = new Set(['low', 'medium']);
const PROMOTABLE = new Set(['approved', 'waiting_for_window']);

export const STATUS = {
  WAITING_FOR_WINDOW: 'waiting_for_window',
  PROMOTING: 'promoting',
  BLOCKED: 'blocked',
  EXPIRED: 'expired',
  WAITING_FOR_HUMAN: 'waiting_for_human',
  RELEASED: 'released',
  ROLLING_BACK: 'rolling_back',
  ROLLED_BACK: 'rolled_back',
};

export function loadRegistry(path = DEFAULT_REGISTRY) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function normalizeSha(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^0-9a-f]/g, '');
}

export function shaEquals(left, right) {
  const a = normalizeSha(left);
  const b = normalizeSha(right);
  if (!a || !b) return false;
  const n = Math.min(a.length, b.length);
  if (n < 7) return false;
  return a.slice(0, n) === b.slice(0, n);
}

export function bogotaParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
  );
  const hour = Number(parts.hour === '24' ? '0' : parts.hour);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
  };
}

export function isWindowOpen(date = new Date()) {
  const { hour } = bogotaParts(date);
  return hour >= WINDOW_START_HOUR || hour < WINDOW_END_HOUR;
}

function bogotaInstant(year, month, day, hour, minute) {
  return new Date(Date.UTC(year, month - 1, day, hour + 5, minute));
}

export function windowExpiresAt(from = new Date()) {
  const p = bogotaParts(from);
  if (p.hour < WINDOW_END_HOUR) {
    return bogotaInstant(p.year, p.month, p.day, WINDOW_END_HOUR, 0);
  }
  const nextNoonUtc = new Date(Date.UTC(p.year, p.month - 1, p.day + 1, 12, 0));
  const n = bogotaParts(nextNoonUtc);
  return bogotaInstant(n.year, n.month, n.day, WINDOW_END_HOUR, 0);
}

export function isExpired(rc, now = new Date()) {
  if (rc.expiresAtInstant) return now >= new Date(rc.expiresAtInstant);
  const start = new Date(rc.approvedAt || rc.createdAt || now);
  return now >= windowExpiresAt(start);
}

export function isAutonomousRisk(risk) {
  return AUTONOMOUS_RISKS.has(String(risk || '').toLowerCase());
}

export function hasBoardApproval(rc, seats) {
  if (String(rc.boardDecision || '').toLowerCase() !== 'approved') return false;
  const evidence = rc.boardEvidence && typeof rc.boardEvidence === 'object' ? rc.boardEvidence : {};
  return (seats || []).every((seat) => String(evidence[seat] || '').toUpperCase() === 'APPROVE');
}

export function listBlockedMigrations(rc, blockedIds) {
  const planned = [
    ...(Array.isArray(rc.migrations) ? rc.migrations : []),
    rc.migrationPlan,
  ]
    .filter(Boolean)
    .map((item) => String(item).toLowerCase());
  if (planned.length === 0 || planned.every((item) => item === 'none')) return [];
  return (blockedIds || []).filter((id) => planned.some((item) => item.includes(String(id))));
}

export function migrationPlanBlocks(rc, blockedIds) {
  const plan = String(rc.migrationPlan || 'none').toLowerCase();
  if (plan !== 'none' && plan !== '') return true;
  if (Array.isArray(rc.migrations) && rc.migrations.length > 0) return true;
  return listBlockedMigrations(rc, blockedIds).length > 0;
}

export function isCircuitOpen(registry, product) {
  const circuit = registry.circuit?.[product] || {};
  if (circuit.open) return true;
  const max = Number(circuit.maxConsecutiveRollbacks || 2);
  return Number(circuit.consecutiveRollbacks || 0) >= max;
}

export function isAutonomyEnabled(registry, product) {
  const flags = registry.autonomousPromotion || {};
  if (!flags.enabled) return false;
  return Boolean(flags.products?.[product]);
}

export function selectPromotable(registry, product) {
  const rows = Array.isArray(registry.candidates) ? registry.candidates : [];
  return rows.filter((rc) => {
    if (product && rc.product !== product) return false;
    return PROMOTABLE.has(String(rc.status || '').toLowerCase());
  });
}

function fail(rc, status, reason, extras = {}) {
  return {
    action: 'block',
    shouldDeploy: false,
    wouldPromote: false,
    nextStatus: status,
    reason,
    deploySha: rc.gitSha,
    rollbackSha: rc.previousProductionSha,
    rcId: rc.id,
    product: rc.product,
    ...extras,
  };
}

function hold(rc, reason, extras = {}) {
  return {
    action: 'hold',
    shouldDeploy: false,
    wouldPromote: Boolean(extras.wouldPromote),
    nextStatus: extras.nextStatus || STATUS.WAITING_FOR_WINDOW,
    reason,
    deploySha: rc.gitSha,
    rollbackSha: rc.previousProductionSha,
    rcId: rc.id,
    product: rc.product,
    ...extras,
  };
}

function firstHardBlock(rc, evidence, registry, now) {
  const seats = registry.requiredBoardSeats || [];
  const blockedIds = registry.blockedMigrations || [];
  if (isCircuitOpen(registry, rc.product)) {
    return fail(rc, STATUS.WAITING_FOR_HUMAN, 'circuit_open');
  }
  if (isExpired(rc, now)) return fail(rc, STATUS.EXPIRED, 'expired');
  if (!hasBoardApproval(rc, seats)) {
    return fail(rc, STATUS.WAITING_FOR_HUMAN, 'board_not_approved');
  }
  if (!isAutonomousRisk(rc.riskLevel)) {
    return fail(rc, STATUS.WAITING_FOR_HUMAN, 'risk_requires_human');
  }
  if (migrationPlanBlocks(rc, blockedIds)) {
    return fail(rc, STATUS.WAITING_FOR_HUMAN, 'migrations_blocked');
  }
  if (evidence.requestedSha && !shaEquals(rc.gitSha, evidence.requestedSha)) {
    return fail(rc, STATUS.BLOCKED, 'requested_sha_mismatch');
  }
  if (!evidence.stagingHealthOk || !shaEquals(rc.gitSha, evidence.stagingSha)) {
    return fail(rc, STATUS.BLOCKED, 'staging_sha_or_health');
  }
  if (evidence.ciGreen === false || rc.ciVerified === false) {
    return fail(rc, STATUS.BLOCKED, 'ci_not_green');
  }
  if (evidence.securityGreen === false || rc.securityVerified === false) {
    return fail(rc, STATUS.BLOCKED, 'security_degraded');
  }
  if (!evidence.prodHealthOk) return fail(rc, STATUS.BLOCKED, 'production_unhealthy');
  if (!normalizeSha(rc.previousProductionSha)) {
    return fail(rc, STATUS.BLOCKED, 'rollback_sha_missing');
  }
  return null;
}

export function revalidate(rc, evidence, registry) {
  const now = evidence.now ? new Date(evidence.now) : new Date();
  const windowOpen = evidence.windowOpen ?? isWindowOpen(now);
  const blocked = firstHardBlock(rc, evidence, registry, now);
  if (blocked) return blocked;
  if (!PROMOTABLE.has(String(rc.status || '').toLowerCase())) {
    return hold(rc, 'status_not_promotable', { nextStatus: rc.status });
  }
  if (!windowOpen) {
    return hold(rc, 'window_closed', { wouldPromote: true });
  }

  const autonomy = isAutonomyEnabled(registry, rc.product);
  if (!autonomy) {
    return hold(rc, 'autonomy_disabled', {
      wouldPromote: true,
      nextStatus: STATUS.WAITING_FOR_WINDOW,
    });
  }

  return {
    action: 'promote',
    shouldDeploy: true,
    wouldPromote: true,
    nextStatus: STATUS.PROMOTING,
    reason: 'revalidated',
    deploySha: rc.gitSha,
    rollbackSha: rc.previousProductionSha,
    rcId: rc.id,
    product: rc.product,
    mainShaIgnored: evidence.mainSha || null,
  };
}

export function decidePromotion(registry, evidence, product) {
  const pending = selectPromotable(registry, product);
  if (pending.length === 0) {
    return {
      action: 'hold',
      shouldDeploy: false,
      wouldPromote: false,
      reason: 'no_pending_rc',
      nextStatus: STATUS.WAITING_FOR_WINDOW,
    };
  }
  return revalidate(pending[0], evidence, registry);
}

export function verifyProductionHealth(health, expected) {
  const flags = health?.observability?.flags || {};
  const problems = [];
  if (health?.status !== 'ok') problems.push('health_not_ok');
  if (expected.sha && !shaEquals(health?.git_sha, expected.sha)) {
    problems.push('deployed_sha_mismatch');
  }
  if (expected.environment && health?.environment && health.environment !== expected.environment) {
    problems.push('environment_mismatch');
  }
  const requiredFlags = expected.flags || {};
  for (const [key, value] of Object.entries(requiredFlags)) {
    if (flags[key] !== value) problems.push(`flag_${key}`);
  }
  return { ok: problems.length === 0, problems, sha: health?.git_sha || null };
}

export function morningReport(registry, decisions = []) {
  const lines = ['# Overnight Releases', ''];
  for (const rc of registry.candidates || []) {
    const decision = decisions.find((row) => row.rcId === rc.id) || {};
    lines.push(`## ${rc.product}`);
    lines.push(`RC: ${rc.gitSha}`);
    lines.push(`Status: ${decision.nextStatus || rc.status}`);
    lines.push(`Result: ${decision.action || 'pending'}`);
    if (decision.reason) lines.push(`Check: ${decision.reason}`);
    lines.push(`Rollback SHA: ${rc.previousProductionSha}`);
    lines.push(`Autonomy: ${isAutonomyEnabled(registry, rc.product) ? 'on' : 'off'}`);
    lines.push('');
  }
  return lines.join('\n');
}

function parseArgs(argv) {
  const out = { flags: new Set(), values: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out.values[key] = next;
      i += 1;
    } else {
      out.flags.add(key);
    }
  }
  return out;
}

function readEvidence(path) {
  if (!path) return {};
  return JSON.parse(readFileSync(path, 'utf8'));
}

async function gatherLiveEvidence() {
  const stagingUrl = process.env.PESKIDS_STAGING_HEALTH_URL || 'https://peskids-staging.op-sly.com/api/health';
  const prodUrl = process.env.PESKIDS_PROD_HEALTH_URL || 'https://www.peskids.com/api/health';
  const [staging, prod] = await Promise.all([
    fetch(stagingUrl).then((r) => r.json()),
    fetch(prodUrl).then((r) => r.json()),
  ]);
  return {
    stagingSha: staging.git_sha,
    stagingHealthOk: staging.status === 'ok',
    prodSha: prod.git_sha,
    prodHealthOk: prod.status === 'ok',
    ciGreen: true,
    securityGreen: true,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const registry = loadRegistry(args.values.registry || DEFAULT_REGISTRY);
  const product = args.values.product || 'peskids';

  if (args.flags.has('morning-report')) {
    process.stdout.write(`${morningReport(registry)}\n`);
    return;
  }

  if (args.flags.has('verify-prod')) {
    const health = args.values['health-file']
      ? JSON.parse(readFileSync(args.values['health-file'], 'utf8'))
      : await fetch(process.env.PESKIDS_PROD_HEALTH_URL || 'https://www.peskids.com/api/health').then((r) => r.json());
    const flags = {};
    if (args.values['expected-flag']) {
      const [key, value] = String(args.values['expected-flag']).split('=');
      flags[key] = value === 'true';
    }
    const result = verifyProductionHealth(health, {
      sha: args.values['expected-sha'],
      flags,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exit(result.ok ? 0 : 1);
  }

  let evidence = readEvidence(args.values['evidence-file']);
  if (args.flags.has('gather') || (args.flags.has('revalidate') && !args.values['evidence-file'])) {
    evidence = { ...((await gatherLiveEvidence())), ...evidence };
  }

  const decision = decidePromotion(registry, evidence, product);
  const payload = {
    ...decision,
    autonomyEnabled: isAutonomyEnabled(registry, product),
    windowOpen: evidence.windowOpen ?? isWindowOpen(evidence.now ? new Date(evidence.now) : new Date()),
  };

  if (args.flags.has('json') || args.flags.has('revalidate') || args.flags.has('select')) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  }

  if (args.flags.has('strict') && payload.action === 'block') {
    process.exit(2);
  }
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
