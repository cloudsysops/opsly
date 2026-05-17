import { describe, expect, it } from 'vitest';
import {
  detectEnvironment,
  detectOs,
  generateRecommendation,
  type DetectorDeps,
  type SystemInfo,
} from '../src/environment-detector.js';

function mockDeps(overrides: Partial<DetectorDeps> & { tools?: string[] }): DetectorDeps {
  const tools = new Set(overrides.tools ?? ['docker', 'colima', 'ollama', 'redis-cli', 'tmux']);
  return {
    platform: 'darwin',
    arch: 'arm64',
    cpuCount: 8,
    totalMemBytes: 16 * 1024 ** 3,
    commandExists: async (name: string) => tools.has(name),
    runCommand: async () => ({ stdout: '', exitCode: 1 }),
    diskFreeGb: async () => 120,
    ...overrides,
  };
}

describe('detectOs', () => {
  it('maps node platforms', () => {
    expect(detectOs('darwin')).toBe('macos');
    expect(detectOs('linux')).toBe('linux');
    expect(detectOs('win32')).toBe('windows');
  });
});

describe('generateRecommendation', () => {
  const baseSystem: SystemInfo = {
    os: 'macos',
    cpuCores: 8,
    ramGb: 16,
    gpuAvailable: true,
    diskFreeGb: 100,
    dockerAvailable: true,
    colimaAvailable: true,
    podmanAvailable: false,
    ollamaAvailable: true,
    redisAvailable: true,
    tmuxAvailable: true,
  };

  it('recommends colima and 2 workers on Mac 16GB+', () => {
    const rec = generateRecommendation(baseSystem);
    expect(rec.topologyType).toBe('local-only');
    expect(rec.dockerEngine).toBe('colima');
    expect(rec.maxLocalWorkers).toBeGreaterThanOrEqual(2);
    expect(rec.useLocalOllama).toBe(true);
  });

  it('suggests hybrid on Mac 8-16GB', () => {
    const rec = generateRecommendation({ ...baseSystem, ramGb: 12 });
    expect(rec.topologyType).toBe('hybrid');
    expect(rec.maxLocalWorkers).toBe(1);
    expect(rec.suggestedCloudRole).toBe('overflow');
  });

  it('scales workers on Linux server', () => {
    const rec = generateRecommendation({
      ...baseSystem,
      os: 'linux',
      colimaAvailable: false,
      podmanAvailable: false,
      cpuCores: 8,
    });
    expect(rec.maxLocalWorkers).toBe(4);
    expect(rec.dockerEngine).toBe('docker-desktop');
  });

  it('uses hybrid defaults on Windows', () => {
    const rec = generateRecommendation({
      ...baseSystem,
      os: 'windows',
      colimaAvailable: false,
    });
    expect(rec.topologyType).toBe('hybrid');
    expect(rec.maxLocalWorkers).toBe(2);
  });
});

describe('detectEnvironment', () => {
  it('returns RuntimeProfile with timestamp', async () => {
    const profile = await detectEnvironment(mockDeps({ platform: 'linux', cpuCount: 4 }));
    expect(profile.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(profile.system.os).toBe('linux');
    expect(profile.system.cpuCores).toBe(4);
    expect(profile.recommendation.maxLocalWorkers).toBeGreaterThanOrEqual(1);
  });

  it('marks GPU on Apple Silicon', async () => {
    const profile = await detectEnvironment(mockDeps({ platform: 'darwin', arch: 'arm64' }));
    expect(profile.system.gpuAvailable).toBe(true);
  });

  it('detects missing docker engine in warnings', async () => {
    const profile = await detectEnvironment(mockDeps({ tools: ['tmux'] }));
    expect(profile.recommendation.warnings.some((w) => w.includes('container engine'))).toBe(true);
    expect(profile.recommendation.dockerEngine).toBe('none');
  });
});
