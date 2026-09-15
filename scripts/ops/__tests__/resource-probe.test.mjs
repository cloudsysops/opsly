import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { snapshotCpuMemory, parseNvidiaSmiOutput, probeGpu, probeResources } from '../resource-probe.mjs';

function fakeOs({ totalmem = 32 * 1024 ** 3, freemem = 8 * 1024 ** 3, load1 = 2, cpuCount = 8 } = {}) {
  return {
    totalmem: () => totalmem,
    freemem: () => freemem,
    loadavg: () => [load1, load1, load1],
    cpus: () => Array.from({ length: cpuCount }, () => ({})),
    hostname: () => 'test-host',
  };
}

describe('resource-probe: snapshotCpuMemory', () => {
  it('converts bytes to GB and normalizes load average by core count', () => {
    const snap = snapshotCpuMemory(fakeOs({ totalmem: 16 * 1024 ** 3, freemem: 4 * 1024 ** 3, load1: 4, cpuCount: 8 }));
    assert.equal(snap.ram_total_gb, 16);
    assert.equal(snap.ram_free_gb, 4);
    // load 4 / 8 cores = 50%
    assert.equal(snap.cpu_load_pct, 50);
    assert.equal(snap.cpu_count, 8);
  });

  it('clamps cpu_load_pct at 100 on heavy overcommit', () => {
    const snap = snapshotCpuMemory(fakeOs({ load1: 40, cpuCount: 8 }));
    assert.equal(snap.cpu_load_pct, 100);
  });

  it('falls back to 1 core when cpus() reports none (never divides by zero)', () => {
    const snap = snapshotCpuMemory(fakeOs({ load1: 2, cpuCount: 0 }));
    assert.equal(snap.cpu_count, 1);
    assert.equal(snap.cpu_load_pct, 100);
  });
});

describe('resource-probe: parseNvidiaSmiOutput', () => {
  it('parses a single-GPU CSV line into free/utilization percentages', () => {
    const parsed = parseNvidiaSmiOutput('4096, 16384, 20\n');
    assert.deepEqual(parsed, {
      has_gpu: true,
      gpu_vram_free_pct: 75,
      gpu_utilization_pct: 20,
      gpu_vram_total_mb: 16384,
      gpu_vram_used_mb: 4096,
    });
  });

  it('uses only the first line on a multi-GPU host', () => {
    const parsed = parseNvidiaSmiOutput('1000, 10000, 5\n2000, 20000, 10\n');
    assert.equal(parsed.gpu_vram_total_mb, 10000);
  });

  it('returns null on empty or malformed output', () => {
    assert.equal(parseNvidiaSmiOutput(''), null);
    assert.equal(parseNvidiaSmiOutput('not,a,number'), null);
    assert.equal(parseNvidiaSmiOutput('100,0,5'), null); // total=0 guarded
  });
});

describe('resource-probe: probeGpu', () => {
  it('degrades to has_gpu:false when nvidia-smi is unavailable (never fabricates a reading)', async () => {
    const execFn = async () => {
      throw new Error('command not found: nvidia-smi');
    };
    const result = await probeGpu(execFn);
    assert.deepEqual(result, { has_gpu: false });
  });

  it('returns a full GPU snapshot when nvidia-smi succeeds', async () => {
    const execFn = async () => ({ stdout: '2000, 8000, 15\n' });
    const result = await probeGpu(execFn);
    assert.equal(result.has_gpu, true);
    assert.equal(result.gpu_vram_free_pct, 75);
  });
});

describe('resource-probe: probeResources', () => {
  it('composes CPU/memory and GPU into one snapshot with a timestamp and hostname', async () => {
    const execFn = async () => ({ stdout: '1000, 4000, 10\n' });
    const snapshot = await probeResources({ execFn, osModule: fakeOs(), includeGpu: true });
    assert.ok(snapshot.timestamp);
    assert.equal(snapshot.hostname, 'test-host');
    assert.equal(snapshot.has_gpu, true);
    assert.ok('ram_free_gb' in snapshot);
  });

  it('skips the GPU exec entirely when includeGpu is false (e.g. the VPS)', async () => {
    let called = false;
    const execFn = async () => {
      called = true;
      return { stdout: '1,2,3' };
    };
    const snapshot = await probeResources({ execFn, osModule: fakeOs(), includeGpu: false });
    assert.equal(called, false);
    assert.equal(snapshot.has_gpu, false);
  });
});
