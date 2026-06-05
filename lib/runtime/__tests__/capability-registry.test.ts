import { describe, expect, it } from 'vitest';
import { detectCapabilityRegistry, type DetectorDeps, type RuntimeProfile } from '../src/index.js';

function mockDeps(overrides: Partial<DetectorDeps> & { tools?: string[] } = {}): DetectorDeps {
  const tools = new Set(
    overrides.tools ?? [
      'docker',
      'colima',
      'ollama',
      'redis-cli',
      'tmux',
      'gh',
      'claude',
      'codex',
      'cursor',
      'code',
    ]
  );
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

describe('detectCapabilityRegistry', () => {
  it('returns a capability registry for a local-first Mac', async () => {
    const profile: RuntimeProfile = {
      timestamp: new Date().toISOString(),
      system: {
        os: 'macos',
        cpuCores: 8,
        ramGb: 16,
        gpuAvailable: true,
        diskFreeGb: 120,
        dockerAvailable: true,
        colimaAvailable: true,
        podmanAvailable: false,
        ollamaAvailable: true,
        redisAvailable: true,
        tmuxAvailable: true,
      },
      recommendation: {
        topologyType: 'local-only',
        dockerEngine: 'colima',
        maxLocalWorkers: 2,
        useLocalRedis: true,
        useLocalOllama: true,
        suggestedCloudRole: 'none',
        estimatedSetupMinutes: 10,
        setupDifficulty: 'easy',
        warnings: [],
        notes: [],
      },
    };

    const registry = await detectCapabilityRegistry(mockDeps(), profile);
    expect(registry.machine.topologyType).toBe('local-only');
    expect(registry.capabilities.some((cap) => cap.id === 'opsly-orchestrator')).toBe(true);
    expect(
      registry.capabilities.some((cap) => cap.id === 'tmux' && cap.presence === 'available')
    ).toBe(true);
    expect(registry.detectedEditors).toContain('Cursor');
    expect(registry.detectedAgents).toContain('Claude Code');
  });
});
