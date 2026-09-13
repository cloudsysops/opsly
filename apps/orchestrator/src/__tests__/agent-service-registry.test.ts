import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { AgentServiceRegistry } from '../lib/agent/agent-service-registry.js';

const originalCwd = process.cwd();
const originalConfig = process.env.OPSLY_AGENT_SERVICES_CONFIG;
const originalOpenClawAcceptance = process.env.OPSLY_OPENCLAW_ACCEPTANCE_ENABLED;

afterEach(() => {
  process.chdir(originalCwd);
  if (originalConfig === undefined) {
    delete process.env.OPSLY_AGENT_SERVICES_CONFIG;
  } else {
    process.env.OPSLY_AGENT_SERVICES_CONFIG = originalConfig;
  }
  if (originalOpenClawAcceptance === undefined) {
    delete process.env.OPSLY_OPENCLAW_ACCEPTANCE_ENABLED;
  } else {
    process.env.OPSLY_OPENCLAW_ACCEPTANCE_ENABLED = originalOpenClawAcceptance;
  }
});

describe('AgentServiceRegistry config resolution', () => {
  it('falls back from apps/orchestrator cwd to monorepo root config', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'opsly-agent-registry-'));
    const orchestratorDir = path.join(root, 'apps', 'orchestrator');
    await mkdir(path.join(root, 'config'), { recursive: true });
    await mkdir(orchestratorDir, { recursive: true });
    await writeFile(
      path.join(root, 'config', 'agent-services.yaml'),
      [
        'services:',
        '  local_opencode:',
        '    enabled: true',
        '    endpoint: http://127.0.0.1:5004',
        '    type: http',
        'defaults:',
        '  default_agent: opencode',
        '  fallback_chain:',
        '    - opencode',
        '',
      ].join('\n'),
      'utf-8',
    );

    process.chdir(orchestratorDir);

    const registry = new AgentServiceRegistry();
    const service = await registry.getService('opencode');

    expect(service?.url).toBe('http://127.0.0.1:5004');
  });


  it('keeps OpenClaw disabled unless the explicit acceptance gate is set', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'opsly-openclaw-registry-'));
    const configPath = path.join(root, 'agent-services.yaml');
    await writeFile(
      configPath,
      [
        'services:',
        '  local_openclaw:',
        '    enabled: false',
        '    endpoint: http://127.0.0.1:5012',
        '    type: http',
        'defaults:',
        '  default_agent: opencode',
        '  fallback_chain:',
        '    - opencode',
        '',
      ].join('\n'),
      'utf-8',
    );

    process.env.OPSLY_AGENT_SERVICES_CONFIG = configPath;
    delete process.env.OPSLY_OPENCLAW_ACCEPTANCE_ENABLED;

    const disabled = new AgentServiceRegistry();
    expect(await disabled.getService('openclaw')).toBeNull();

    process.env.OPSLY_OPENCLAW_ACCEPTANCE_ENABLED = 'true';
    const acceptance = new AgentServiceRegistry();
    expect((await acceptance.getService('openclaw'))?.url).toBe('http://127.0.0.1:5012');
  });
});
