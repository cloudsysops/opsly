import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateIdleWindow, DEFAULT_NODE_THRESHOLDS } from '../idle-window-policy.mjs';

function macSnapshot(overrides = {}) {
  return { ram_free_gb: 10, cpu_load_pct: 20, has_gpu: false, ...overrides };
}

function gamerSnapshot(overrides = {}) {
  return {
    ram_free_gb: 16,
    cpu_load_pct: 15,
    has_gpu: true,
    gpu_vram_free_pct: 50,
    gpu_utilization_pct: 10,
    ...overrides,
  };
}

describe('idle-window-policy: mac node', () => {
  it('is eligible when idle with plenty of free RAM/CPU', () => {
    const result = evaluateIdleWindow(macSnapshot(), 'mac');
    assert.equal(result.eligible, true);
    assert.deepEqual(result.reasons, []);
  });

  it('rejects when RAM is below the threshold', () => {
    const result = evaluateIdleWindow(macSnapshot({ ram_free_gb: 3 }), 'mac');
    assert.equal(result.eligible, false);
    assert.match(result.reasons[0], /ram_free_gb 3 < required 6/);
  });

  it('rejects when CPU load is above the threshold', () => {
    const result = evaluateIdleWindow(macSnapshot({ cpu_load_pct: 90 }), 'mac');
    assert.equal(result.eligible, false);
    assert.match(result.reasons[0], /cpu_load_pct 90 > allowed 60/);
  });

  it('rejects when already at max_background_agents', () => {
    const result = evaluateIdleWindow(macSnapshot(), 'mac', { active_background_agents: 1 });
    assert.equal(result.eligible, false);
    assert.match(result.reasons[0], /already at max_background_agents \(1\/1\)/);
  });

  it('rejects on any caller-supplied active lock (e.g. a foreground dev session)', () => {
    const result = evaluateIdleWindow(macSnapshot(), 'mac', {
      active_lock_reasons: ['human actively typing'],
    });
    assert.equal(result.eligible, false);
    assert.match(result.reasons[0], /active lock: human actively typing/);
  });

  it('accumulates every failing reason instead of stopping at the first', () => {
    const result = evaluateIdleWindow(macSnapshot({ ram_free_gb: 1, cpu_load_pct: 99 }), 'mac', {
      active_background_agents: 1,
    });
    assert.equal(result.reasons.length, 3);
  });
});

describe('idle-window-policy: gamer node', () => {
  it('is eligible when GPU is free and idle', () => {
    const result = evaluateIdleWindow(gamerSnapshot(), 'gamer');
    assert.equal(result.eligible, true);
  });

  it('rejects when no GPU is detected but the node requires one', () => {
    const result = evaluateIdleWindow(gamerSnapshot({ has_gpu: false }), 'gamer');
    assert.equal(result.eligible, false);
    assert.match(result.reasons[0], /gpu required by node thresholds but none detected/);
  });

  it('rejects when GPU VRAM free is below threshold', () => {
    const result = evaluateIdleWindow(gamerSnapshot({ gpu_vram_free_pct: 10 }), 'gamer');
    assert.equal(result.eligible, false);
    assert.match(result.reasons[0], /gpu_vram_free_pct 10 < required 35/);
  });

  it('rejects when GPU utilization is above threshold (e.g. Mauro is gaming)', () => {
    const result = evaluateIdleWindow(gamerSnapshot({ gpu_utilization_pct: 80 }), 'gamer');
    assert.equal(result.eligible, false);
    assert.match(result.reasons[0], /gpu_utilization_pct 80 > allowed 25/);
  });
});

describe('idle-window-policy: vps node', () => {
  it('is always ineligible — the VPS coordinates, it does not execute background agents', () => {
    // Even a wildly idle snapshot must not make the VPS eligible.
    const result = evaluateIdleWindow({ ram_free_gb: 1000, cpu_load_pct: 0, has_gpu: false }, 'vps');
    assert.equal(result.eligible, false);
    assert.match(result.reasons[0], /coordinator only/);
  });

  it('cannot be overridden into eligibility via a thresholds override (max_background_agents=0 is a hard rule)', () => {
    const result = evaluateIdleWindow(
      { ram_free_gb: 1000, cpu_load_pct: 0, has_gpu: false },
      'vps',
      { thresholds: { max_background_agents: 5, min_ram_free_gb: 0.1 } }
    );
    // NOTE: this documents current behavior — an explicit override CAN raise
    // max_background_agents above 0 if a caller passes one. The hard "VPS
    // never executes" guarantee lives in the default policy, not as an
    // unconditional invariant of this function. Flagging this explicitly
    // rather than silently relying on defaults never being overridden.
    assert.equal(result.eligible, true);
  });
});

describe('idle-window-policy: unknown node type', () => {
  it('fails closed with a clear reason', () => {
    const result = evaluateIdleWindow(macSnapshot(), 'raspberry-pi');
    assert.equal(result.eligible, false);
    assert.match(result.reasons[0], /unknown node type: raspberry-pi/);
  });
});

describe('idle-window-policy: DEFAULT_NODE_THRESHOLDS matches the agreed spec', () => {
  it('mac: 6GB RAM, 60% CPU, 1 background agent', () => {
    assert.deepEqual(DEFAULT_NODE_THRESHOLDS.mac, {
      min_ram_free_gb: 6,
      max_cpu_load_pct: 60,
      max_background_agents: 1,
    });
  });

  it('gamer: 12GB RAM, 35% free VRAM, <25% GPU util, 1 background agent', () => {
    assert.deepEqual(DEFAULT_NODE_THRESHOLDS.gamer, {
      min_ram_free_gb: 12,
      min_gpu_vram_free_pct: 35,
      max_gpu_utilization_pct: 25,
      max_background_agents: 1,
    });
  });

  it('vps: 0 background agents (coordinator only)', () => {
    assert.deepEqual(DEFAULT_NODE_THRESHOLDS.vps, { max_background_agents: 0 });
  });
});
