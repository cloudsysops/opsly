#!/usr/bin/env node
/**
 * Smoke: external-agent-registry load + intent routing (no live binaries required).
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
process.env.OPSLY_ROOT = repoRoot;

const registryMod = await import(
  join(repoRoot, 'lib/external-agent-registry/dist/index.js')
);

const { loadExternalAgentRegistry, routeExternalWorker } = registryMod;

const registry = await loadExternalAgentRegistry(repoRoot);

const arch = routeExternalWorker(registry, { intent: 'architecture' });
const impl = routeExternalWorker(registry, { agentRole: 'executor' });

console.log('[external-agents-smoke] registry version', registry.version);
console.log('[external-agents-smoke] architecture ->', arch.workerId, arch.opslyJobType);
console.log('[external-agents-smoke] implementation ->', impl.workerId, impl.opslyJobType);

if (arch.workerId !== 'claude-code' || impl.workerId !== 'opencode') {
  console.error('[external-agents-smoke] routing mismatch');
  process.exit(1);
}

console.log('[external-agents-smoke] OK');
