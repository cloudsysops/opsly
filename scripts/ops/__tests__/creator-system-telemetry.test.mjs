import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectCreatorSystemSnapshot,
  collectHostTelemetry,
  collectNvidiaTelemetry,
  parseNvidiaSmiCsv,
} from '../creator-system-telemetry.mjs';

test('host telemetry only reports user-owned system signals', () => {
  const snapshot = collectHostTelemetry();
  assert.equal(snapshot.sourceClass, 'user-hardware');
  assert.equal(snapshot.fairPlayCertified, true);
  assert.ok(snapshot.cpu.logicalCores >= 1);
  assert.ok(snapshot.memory.totalBytes > 0);
  assert.ok(snapshot.memory.usedPercent >= 0);
  assert.ok(snapshot.memory.usedPercent <= 100);
});

test('nvidia-smi parser normalizes expected six-column rows', () => {
  const rows = parseNvidiaSmiCsv(
    'NVIDIA GeForce RTX 5070 Ti, 590.12, 2048, 16384, 73, 61\n',
  );
  assert.deepEqual(rows, [
    {
      name: 'NVIDIA GeForce RTX 5070 Ti',
      driverVersion: '590.12',
      memoryUsedMiB: 2048,
      memoryTotalMiB: 16384,
      utilizationGpuPercent: 73,
      temperatureC: 61,
    },
  ]);
});

test('nvidia telemetry is optional and fails closed to unavailable', async () => {
  const result = await collectNvidiaTelemetry({
    execute: async () => {
      throw new Error('nvidia-smi missing');
    },
  });

  assert.equal(result.available, false);
  assert.equal(result.devices.length, 0);
  assert.match(result.reason, /missing/);
});

test('nvidia telemetry invokes only nvidia-smi with the fixed safe query', async () => {
  let executable = null;
  let args = null;

  const result = await collectNvidiaTelemetry({
    execute: async (receivedExecutable, receivedArgs) => {
      executable = receivedExecutable;
      args = receivedArgs;
      return {
        stdout: 'GPU, 1.2.3, 10, 100, 5, 45\n',
        stderr: '',
      };
    },
  });

  assert.equal(executable, 'nvidia-smi');
  assert.deepEqual(args, [
    '--query-gpu=name,driver_version,memory.used,memory.total,utilization.gpu,temperature.gpu',
    '--format=csv,noheader,nounits',
  ]);
  assert.equal(result.available, true);
});

test('system snapshot carries Fair-Play provenance', async () => {
  const snapshot = await collectCreatorSystemSnapshot({
    nvidia: {
      execute: async () => ({
        stdout: 'GPU, 1.2.3, 10, 100, 5, 45\n',
        stderr: '',
      }),
    },
  });

  assert.equal(snapshot.version, 'creator-system-snapshot-v1');
  assert.equal(snapshot.provenance.sourceClass, 'user-hardware');
  assert.equal(snapshot.provenance.fairPlayCertified, true);
});
