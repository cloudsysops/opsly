import { execFile } from 'node:child_process';
import os from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const NVIDIA_QUERY_ARGS = [
  '--query-gpu=name,driver_version,memory.used,memory.total,utilization.gpu,temperature.gpu',
  '--format=csv,noheader,nounits',
];

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function collectHostTelemetry() {
  const cpus = os.cpus();
  const totalMemoryBytes = os.totalmem();
  const freeMemoryBytes = os.freemem();
  const usedMemoryBytes = Math.max(0, totalMemoryBytes - freeMemoryBytes);

  return {
    collectedAt: new Date().toISOString(),
    sourceClass: 'user-hardware',
    fairPlayCertified: true,
    host: {
      platform: os.platform(),
      arch: os.arch(),
      uptimeSeconds: os.uptime(),
    },
    cpu: {
      model: cpus[0]?.model ?? 'unknown',
      logicalCores: cpus.length,
      loadAverage: os.loadavg().map(value => round(value)),
    },
    memory: {
      usedBytes: usedMemoryBytes,
      totalBytes: totalMemoryBytes,
      usedPercent: totalMemoryBytes > 0 ? round((usedMemoryBytes / totalMemoryBytes) * 100) : 0,
    },
  };
}

export function parseNvidiaSmiCsv(stdout) {
  const lines = stdout
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const parts = line.split(',').map(part => part.trim());
    if (parts.length !== 6) {
      throw new Error(`Unexpected nvidia-smi row ${index + 1}: expected 6 columns`);
    }

    const [name, driverVersion, memoryUsedMiB, memoryTotalMiB, utilizationGpuPercent, temperatureC] =
      parts;

    const numeric = {
      memoryUsedMiB: Number(memoryUsedMiB),
      memoryTotalMiB: Number(memoryTotalMiB),
      utilizationGpuPercent: Number(utilizationGpuPercent),
      temperatureC: Number(temperatureC),
    };

    for (const [key, value] of Object.entries(numeric)) {
      if (!Number.isFinite(value)) {
        throw new Error(`Unexpected nvidia-smi value for ${key}`);
      }
    }

    return {
      name,
      driverVersion,
      ...numeric,
    };
  });
}

export async function collectNvidiaTelemetry(options = {}) {
  const execute = options.execute ?? execFileAsync;

  try {
    const { stdout, stderr } = await execute('nvidia-smi', NVIDIA_QUERY_ARGS, {
      timeout: options.timeoutMs ?? 3_000,
      maxBuffer: 128 * 1024,
      windowsHide: true,
    });

    if (stderr?.trim()) {
      throw new Error(stderr.trim());
    }

    return {
      available: true,
      sourceClass: 'user-hardware',
      fairPlayCertified: true,
      devices: parseNvidiaSmiCsv(stdout),
    };
  } catch (error) {
    if (options.required === true) throw error;
    return {
      available: false,
      sourceClass: 'user-hardware',
      fairPlayCertified: true,
      devices: [],
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function collectCreatorSystemSnapshot(options = {}) {
  const [host, gpu] = await Promise.all([
    Promise.resolve(collectHostTelemetry()),
    collectNvidiaTelemetry(options.nvidia),
  ]);

  return {
    version: 'creator-system-snapshot-v1',
    collectedAt: new Date().toISOString(),
    provenance: {
      sourceClass: 'user-hardware',
      fairPlayCertified: true,
      adapterId: 'opsly-system-telemetry',
    },
    host,
    gpu,
  };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  collectCreatorSystemSnapshot()
    .then(snapshot => {
      process.stdout.write(`${JSON.stringify(snapshot)}\n`);
    })
    .catch(error => {
      process.stderr.write(
        `CREATOR_SYSTEM_TELEMETRY_ERROR ${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exit(1);
    });
}
