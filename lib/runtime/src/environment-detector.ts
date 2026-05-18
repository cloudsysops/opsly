/**
 * Environment detector for Opsly local-first runtime.
 * @see docs/01-development/LOCAL-FIRST-ARCHITECTURE.md
 */

import { statfs } from 'node:fs/promises';
import os from 'node:os';
import { execa } from 'execa';

export type OpsOs = 'macos' | 'linux' | 'windows';

export interface SystemInfo {
  os: OpsOs;
  cpuCores: number;
  ramGb: number;
  gpuAvailable: boolean;
  gpuMemoryGb?: number;
  diskFreeGb: number;
  dockerAvailable: boolean;
  colimaAvailable: boolean;
  podmanAvailable: boolean;
  ollamaAvailable: boolean;
  redisAvailable: boolean;
  tmuxAvailable: boolean;
}

export interface RuntimeRecommendation {
  topologyType: 'local-only' | 'hybrid' | 'cloud-recommended';
  dockerEngine: 'colima' | 'docker-desktop' | 'podman' | 'none';
  maxLocalWorkers: number;
  useLocalRedis: boolean;
  useLocalOllama: boolean;
  suggestedCloudRole: 'none' | 'backup' | 'gpu-jobs' | 'overflow';
  estimatedSetupMinutes: number;
  setupDifficulty: 'easy' | 'medium' | 'hard';
  warnings: string[];
  notes: string[];
}

export interface RuntimeProfile {
  timestamp: string;
  system: SystemInfo;
  recommendation: RuntimeRecommendation;
}

export interface DetectorDeps {
  platform: NodeJS.Platform;
  arch: string;
  cpuCount: number;
  totalMemBytes: number;
  commandExists: (name: string) => Promise<boolean>;
  runCommand: (file: string, args: string[]) => Promise<{ stdout: string; exitCode: number }>;
  diskFreeGb: (path: string) => Promise<number>;
}

const BYTES_PER_GB = 1024 ** 3;

export function detectOs(platform: NodeJS.Platform): OpsOs {
  if (platform === 'darwin') {
    return 'macos';
  }
  if (platform === 'linux') {
    return 'linux';
  }
  if (platform === 'win32') {
    return 'windows';
  }
  throw new Error(`Unsupported platform: ${platform}`);
}

export async function commandExists(
  name: string,
  deps: Pick<DetectorDeps, 'platform' | 'runCommand'>,
): Promise<boolean> {
  if (deps.platform === 'win32') {
    const result = await deps.runCommand('where.exe', [name]);
    return result.exitCode === 0 && result.stdout.trim().length > 0;
  }
  const result = await deps.runCommand('sh', ['-c', `command -v ${name}`]);
  return result.exitCode === 0 && result.stdout.trim().length > 0;
}

async function defaultDiskFreeGb(path: string): Promise<number> {
  const stats = await statfs(path);
  const freeBytes = Number(stats.bavail) * Number(stats.bsize);
  return Math.round((freeBytes / BYTES_PER_GB) * 10) / 10;
}

async function detectGpu(
  opsOs: OpsOs,
  deps: DetectorDeps,
): Promise<{ gpuAvailable: boolean; gpuMemoryGb?: number }> {
  if (opsOs === 'macos' && deps.arch === 'arm64') {
    return { gpuAvailable: true };
  }

  const nvidia = await deps.runCommand('nvidia-smi', [
    '--query-gpu=memory.total',
    '--format=csv,noheader,nounits',
  ]);
  if (nvidia.exitCode !== 0 || nvidia.stdout.trim().length === 0) {
    return { gpuAvailable: false };
  }

  const firstLine = nvidia.stdout.trim().split('\n')[0] ?? '';
  const memoryMb = Number.parseInt(firstLine, 10);
  const gpuMemoryGb =
    Number.isFinite(memoryMb) && memoryMb > 0
      ? Math.round((memoryMb / 1024) * 10) / 10
      : undefined;

  return { gpuAvailable: true, gpuMemoryGb };
}

export function generateRecommendation(system: SystemInfo): RuntimeRecommendation {
  const warnings: string[] = [];
  const notes: string[] = [];

  if (system.ramGb < 4) {
    warnings.push('RAM is below 4GB minimum for local workers');
  }
  if (system.diskFreeGb < 10) {
    warnings.push('Less than 10GB free disk space');
  }

  let topologyType: RuntimeRecommendation['topologyType'] = 'hybrid';
  let dockerEngine: RuntimeRecommendation['dockerEngine'] = 'none';
  let maxLocalWorkers = 1;
  let suggestedCloudRole: RuntimeRecommendation['suggestedCloudRole'] = 'none';
  let setupDifficulty: RuntimeRecommendation['setupDifficulty'] = 'medium';
  let estimatedSetupMinutes = 15;

  if (system.os === 'macos') {
    if (system.colimaAvailable) {
      dockerEngine = 'colima';
    } else if (system.dockerAvailable) {
      dockerEngine = 'docker-desktop';
    }
    if (system.ramGb >= 16) {
      topologyType = 'local-only';
      maxLocalWorkers = Math.min(4, Math.max(2, Math.floor(system.cpuCores / 2)));
      setupDifficulty = 'easy';
      estimatedSetupMinutes = 10;
    } else if (system.ramGb >= 8) {
      topologyType = 'hybrid';
      maxLocalWorkers = 1;
      suggestedCloudRole = 'overflow';
      notes.push('8–16GB RAM: prefer 1 local worker; overflow to cloud when busy');
    } else {
      topologyType = 'cloud-recommended';
      suggestedCloudRole = 'gpu-jobs';
      maxLocalWorkers = 1;
      warnings.push('macOS host under 8GB RAM: cloud-assisted topology recommended');
    }
  } else if (system.os === 'linux') {
    if (system.podmanAvailable) {
      dockerEngine = 'podman';
    } else if (system.dockerAvailable) {
      dockerEngine = 'docker-desktop';
    }
    maxLocalWorkers = Math.min(4, Math.max(1, system.cpuCores));
    topologyType = system.ramGb >= 8 ? 'local-only' : 'hybrid';
    if (system.ramGb < 8) {
      suggestedCloudRole = 'overflow';
    }
    setupDifficulty = system.dockerAvailable || system.podmanAvailable ? 'easy' : 'hard';
    estimatedSetupMinutes = system.dockerAvailable ? 10 : 20;
  } else {
    dockerEngine = system.dockerAvailable ? 'docker-desktop' : 'none';
    maxLocalWorkers = 2;
    topologyType = 'hybrid';
    suggestedCloudRole = 'backup';
    notes.push('Windows/WSL2: Docker Desktop + 2 local workers typical');
    setupDifficulty = system.dockerAvailable ? 'medium' : 'hard';
    estimatedSetupMinutes = 20;
  }

  if (dockerEngine === 'none') {
    warnings.push('No container engine detected (install Colima, Docker, or Podman)');
    setupDifficulty = 'hard';
    estimatedSetupMinutes += 10;
  }

  return {
    topologyType,
    dockerEngine,
    maxLocalWorkers,
    useLocalRedis: system.redisAvailable,
    useLocalOllama: system.ollamaAvailable,
    suggestedCloudRole,
    estimatedSetupMinutes,
    setupDifficulty,
    warnings,
    notes,
  };
}

export function createDefaultDeps(): DetectorDeps {
  return {
    platform: process.platform,
    arch: process.arch,
    cpuCount: os.cpus().length,
    totalMemBytes: os.totalmem(),
    commandExists: async (name: string) =>
      commandExists(name, {
        platform: process.platform,
        runCommand: async (file, args) => {
          const result = await execa(file, args, { reject: false });
          return { stdout: result.stdout, exitCode: result.exitCode ?? 1 };
        },
      }),
    runCommand: async (file, args) => {
      const result = await execa(file, args, { reject: false });
      return { stdout: result.stdout, exitCode: result.exitCode ?? 1 };
    },
    diskFreeGb: defaultDiskFreeGb,
  };
}

export async function detectEnvironment(deps: DetectorDeps = createDefaultDeps()): Promise<RuntimeProfile> {
  const opsOs = detectOs(deps.platform);
  const [
    dockerAvailable,
    colimaAvailable,
    podmanAvailable,
    ollamaAvailable,
    redisAvailable,
    tmuxAvailable,
    diskFreeGb,
    gpu,
  ] = await Promise.all([
    deps.commandExists('docker'),
    deps.commandExists('colima'),
    deps.commandExists('podman'),
    deps.commandExists('ollama'),
    deps.commandExists('redis-cli'),
    deps.commandExists('tmux'),
    deps.diskFreeGb(deps.platform === 'win32' ? 'C:\\' : '/'),
    detectGpu(opsOs, deps),
  ]);

  const system: SystemInfo = {
    os: opsOs,
    cpuCores: Math.max(1, deps.cpuCount),
    ramGb: Math.round((deps.totalMemBytes / BYTES_PER_GB) * 10) / 10,
    gpuAvailable: gpu.gpuAvailable,
    gpuMemoryGb: gpu.gpuMemoryGb,
    diskFreeGb,
    dockerAvailable,
    colimaAvailable,
    podmanAvailable,
    ollamaAvailable,
    redisAvailable,
    tmuxAvailable,
  };

  return {
    timestamp: new Date().toISOString(),
    system,
    recommendation: generateRecommendation(system),
  };
}

export async function validateEnvironment(
  profile: RuntimeProfile,
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const { system } = profile;

  if (system.ramGb < 4) {
    errors.push('Minimum 4GB RAM required');
  }
  if (system.diskFreeGb < 10) {
    errors.push('Minimum 10GB free disk required');
  }
  if (!system.dockerAvailable && !system.colimaAvailable && !system.podmanAvailable) {
    errors.push('No container runtime available');
  }

  return { valid: errors.length === 0, errors };
}

export function toMissionControlPayload(profile: RuntimeProfile): Record<string, unknown> {
  return {
    timestamp: profile.timestamp,
    node: {
      os: profile.system.os,
      cpuCores: profile.system.cpuCores,
      ramGb: profile.system.ramGb,
      diskFreeGb: profile.system.diskFreeGb,
      gpuAvailable: profile.system.gpuAvailable,
    },
    recommendation: profile.recommendation,
    tools: {
      docker: profile.system.dockerAvailable,
      colima: profile.system.colimaAvailable,
      podman: profile.system.podmanAvailable,
      ollama: profile.system.ollamaAvailable,
      redis: profile.system.redisAvailable,
      tmux: profile.system.tmuxAvailable,
    },
  };
}
