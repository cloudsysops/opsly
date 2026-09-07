import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  decidePromotion,
  isAutonomyEnabled,
  isCircuitOpen,
  isExpired,
  isWindowOpen,
  loadRegistry,
  morningReport,
  revalidate,
  selectPromotable,
  shaEquals,
  verifyProductionHealth,
  windowExpiresAt,
} from '../release-candidate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const seeded = JSON.parse(readFileSync(join(root, 'config/release-candidates.json'), 'utf8'));

function rc(overrides = {}) {
  return {
    id: 'peskids-f27efea66',
    product: 'peskids',
    gitSha: 'f27efea66c37969bfcdce267a3aeb1c51ce4f226',
    stagingSha: 'f27efea66c37969bfcdce267a3aeb1c51ce4f226',
    previousProductionSha: 'c4822d9e380e142c7b55df856c92027400363113',
    riskLevel: 'medium',
    boardDecision: 'approved',
    boardEvidence: {
      product: 'APPROVE',
      architecture: 'APPROVE',
      security: 'APPROVE',
      database: 'APPROVE',
      qa: 'APPROVE',
      release: 'APPROVE',
    },
    ciVerified: true,
    securityVerified: true,
    stagingVerified: true,
    migrationPlan: 'none',
    migrations: [],
    status: 'waiting_for_window',
    approvedAt: '2026-09-07T02:00:00.000Z',
    ...overrides,
  };
}

function registry(overrides = {}, candidateOverrides = {}) {
  return {
    ...seeded,
    autonomousPromotion: { enabled: true, products: { peskids: true } },
    circuit: { peskids: { open: false, consecutiveRollbacks: 0, maxConsecutiveRollbacks: 2 } },
    candidates: [rc(candidateOverrides)],
    ...overrides,
  };
}

function greenEvidence(overrides = {}) {
  return {
    now: '2026-09-07T03:15:00.000Z',
    mainSha: 'f27efea66c37969bfcdce267a3aeb1c51ce4f226',
    stagingSha: 'f27efea66c37969bfcdce267a3aeb1c51ce4f226',
    stagingHealthOk: true,
    prodSha: 'c4822d9e380e142c7b55df856c92027400363113',
    prodHealthOk: true,
    ciGreen: true,
    securityGreen: true,
    windowOpen: true,
    ...overrides,
  };
}

test('seeded registry is fail-closed and pins immutable SHA', () => {
  const live = loadRegistry(join(root, 'config/release-candidates.json'));
  assert.equal(live.autonomousPromotion.enabled, false);
  assert.equal(live.autonomousPromotion.products.peskids, false);
  const pending = selectPromotable(live, 'peskids');
  assert.equal(pending.length, 0);
  assert.equal(live.candidates.find((row) => row.id === 'peskids-5ed3aa2c').status, 'rolled_back');
  assert.equal(live.candidates.find((row) => row.id === 'peskids-f27efea66').status, 'superseded');
  assert.equal(live.circuit.peskids.consecutiveRollbacks, 1);
  assert.equal(live.circuit.peskids.open, false);
  assert.equal(isAutonomyEnabled(live, 'peskids'), false);
});

test('approved RC is selected and promoted when policy permits', () => {
  const decision = decidePromotion(registry(), greenEvidence(), 'peskids');
  assert.equal(decision.action, 'promote');
  assert.equal(decision.shouldDeploy, true);
  assert.equal(decision.deploySha, 'f27efea66c37969bfcdce267a3aeb1c51ce4f226');
});

test('never retargets HEAD when main moves', () => {
  const decision = revalidate(
    rc(),
    greenEvidence({ mainSha: 'abcd1234abcd1234abcd1234abcd1234abcd1234' }),
    registry()
  );
  assert.equal(decision.action, 'promote');
  assert.equal(decision.deploySha, 'f27efea66c37969bfcdce267a3aeb1c51ce4f226');
  assert.notEqual(decision.deploySha, 'abcd1234abcd1234abcd1234abcd1234abcd1234');
});

test('wrong staging SHA is rejected', () => {
  const decision = revalidate(
    rc(),
    greenEvidence({ stagingSha: 'abcd1234abcd1234abcd1234abcd1234abcd1234' }),
    registry()
  );
  assert.equal(decision.action, 'block');
  assert.equal(decision.reason, 'staging_sha_or_health');
  assert.equal(decision.shouldDeploy, false);
});

test('window closed holds without deploying', () => {
  const decision = revalidate(rc(), greenEvidence({ windowOpen: false }), registry());
  assert.equal(decision.action, 'hold');
  assert.equal(decision.reason, 'window_closed');
  assert.equal(decision.wouldPromote, true);
  assert.equal(decision.shouldDeploy, false);
});

test('Bogota window helper is 22:00-06:00', () => {
  assert.equal(isWindowOpen(new Date('2026-09-07T02:50:00.000Z')), false);
  assert.equal(isWindowOpen(new Date('2026-09-07T03:10:00.000Z')), true);
  assert.equal(isWindowOpen(new Date('2026-09-07T10:59:00.000Z')), true);
  assert.equal(isWindowOpen(new Date('2026-09-07T11:00:00.000Z')), false);
});

test('migration plans and blocked ids fail closed', () => {
  const blockedPlan = revalidate(rc({ migrationPlan: 'apply' }), greenEvidence(), registry());
  assert.equal(blockedPlan.reason, 'migrations_blocked');
  const blockedId = revalidate(rc({ migrations: ['0103_peskids_foo'] }), greenEvidence(), registry());
  assert.equal(blockedId.reason, 'migrations_blocked');
  for (const id of ['0098', '0099', '0104', '0105', '0106']) {
    const decision = revalidate(rc({ migrations: [id] }), greenEvidence(), registry());
    assert.equal(decision.action, 'block');
  }
});

test('HIGH risk and missing board seats require a human', () => {
  const high = revalidate(rc({ riskLevel: 'high' }), greenEvidence(), registry());
  assert.equal(high.reason, 'risk_requires_human');
  const critical = revalidate(rc({ riskLevel: 'critical' }), greenEvidence(), registry());
  assert.equal(critical.reason, 'risk_requires_human');
  const noQa = revalidate(
    rc({ boardEvidence: { ...rc().boardEvidence, qa: 'HOLD' } }),
    greenEvidence(),
    registry()
  );
  assert.equal(noQa.reason, 'board_not_approved');
});

test('feature flag off dry-runs but does not deploy', () => {
  const live = registry({
    autonomousPromotion: { enabled: false, products: { peskids: false } },
  });
  const decision = decidePromotion(live, greenEvidence(), 'peskids');
  assert.equal(decision.action, 'hold');
  assert.equal(decision.reason, 'autonomy_disabled');
  assert.equal(decision.wouldPromote, true);
  assert.equal(decision.shouldDeploy, false);
});

test('smoke SHA mismatch triggers rollback target', () => {
  const check = verifyProductionHealth(
    { status: 'ok', git_sha: 'deadbeefdeadbeef', observability: { flags: { hot_lead_alerts: true } } },
    { sha: 'f27efea66c37969bfcdce267a3aeb1c51ce4f226', flags: { hot_lead_alerts: true } }
  );
  assert.equal(check.ok, false);
  assert.ok(check.problems.includes('deployed_sha_mismatch'));
  const decision = revalidate(rc(), greenEvidence(), registry());
  assert.equal(decision.rollbackSha, 'c4822d9e380e142c7b55df856c92027400363113');
});

test('circuit breaker stops autonomous promotion', () => {
  const open = registry({
    circuit: { peskids: { open: true, consecutiveRollbacks: 0, maxConsecutiveRollbacks: 2 } },
  });
  assert.equal(isCircuitOpen(open, 'peskids'), true);
  assert.equal(revalidate(rc(), greenEvidence(), open).reason, 'circuit_open');

  const tripped = registry({
    circuit: { peskids: { open: false, consecutiveRollbacks: 2, maxConsecutiveRollbacks: 2 } },
  });
  assert.equal(isCircuitOpen(tripped, 'peskids'), true);
});

test('expired RC and unhealthy prod fail closed', () => {
  const expired = isExpired(rc({ approvedAt: '2026-09-06T02:00:00.000Z' }), new Date('2026-09-07T12:00:00.000Z'));
  assert.equal(expired, true);
  const unhealthy = revalidate(rc(), greenEvidence({ prodHealthOk: false }), registry());
  assert.equal(unhealthy.reason, 'production_unhealthy');
});

test('shaEquals accepts short prefixes and rejects short junk', () => {
  assert.equal(shaEquals('f27efea66', 'f27efea66c37969bfcdce267a3aeb1c51ce4f226'), true);
  assert.equal(shaEquals('f27efea6', 'abcd1234'), false);
  assert.equal(shaEquals('abc', 'abcdef0'), false);
});

test('morning report names the exact RC and rollback SHA', () => {
  const report = morningReport(seeded, [
    { rcId: 'peskids-5ed3aa2c', action: 'hold', reason: 'autonomy_disabled', nextStatus: 'waiting_for_window' },
  ]);
  assert.match(report, /5ed3aa2c1469400b5c32a8001852241fe1425e46/);
  assert.match(report, /c4822d9e380e142c7b55df856c92027400363113/);
  assert.match(report, /Autonomy: off/);
});

test('window expiry after first Bogotá night is 06:00', () => {
  const end = windowExpiresAt(new Date('2026-09-07T02:00:00.000Z'));
  assert.equal(end.toISOString(), '2026-09-07T11:00:00.000Z');
});
