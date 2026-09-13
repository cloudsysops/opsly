import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const registry = JSON.parse(readFileSync('config/external-agent-registry.json', 'utf8'));
const policy = JSON.parse(readFileSync('config/external-runtime-policy.json', 'utf8'));
const services = JSON.parse(readFileSync('config/agent-services.json', 'utf8'));
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const orchestratorServices = readFileSync('apps/orchestrator/config/agent-services.yaml', 'utf8');
const bridge = readFileSync('scripts/cli-agent-service.ts', 'utf8');
const launchd = readFileSync('scripts/ops/install-mac-ephemeral-runtime-launchd.sh', 'utf8');
const doctor = readFileSync('scripts/ops/mac-ephemeral-runtime-doctor.sh', 'utf8');
const macWorker = readFileSync('scripts/ops/start-mac-local-agents-worker.sh', 'utf8');

test('OpenClaw is registered as an external runtime but held from automatic routing', () => {
  const entry = registry.workers['openclaw-cli'];
  assert.equal(entry.command, 'openclaw');
  assert.equal(entry.opsly_job_type, 'local_openclaw');
  assert.equal(entry.bridge_port, 5012);
  assert.equal(entry.enabled, false);
  assert.equal(entry.write_access, true);
  assert.equal(entry.risk_ceiling, 'high');

  const upstream = policy.repositories_now.find((item) => item.id === 'openclaw');
  assert.equal(upstream.kind, 'external-agent-runtime');
  assert.equal(upstream.execution_entrypoint, 'openclaw agent exec');
});

test('OpenClaw uses the authenticated generic bridge and headless one-shot exec', () => {
  assert.equal(services.services.local_openclaw.enabled, false);
  assert.match(orchestratorServices, /local_openclaw:\n\s+enabled: false/);
  assert.match(orchestratorServices, /endpoint: http:\/\/localhost:5012/);
  assert.equal(services.services.local_openclaw.url, 'http://localhost:5012');
  assert.equal(services.services.local_openclaw.envUrl, 'OPSLY_OPENCLAW_AGENT_URL');
  assert.equal(
    packageJson.scripts['opsly:local-openclaw-service'],
    'OPSLY_CLI_AGENT=openclaw PORT=5012 tsx scripts/cli-agent-service.ts'
  );

  assert.match(bridge, /case 'openclaw':/);
  assert.match(bridge, /'agent',\s*\n\s*'exec'/);
  assert.match(bridge, /'--cwd'/);
  assert.match(bridge, /OPSLY_OPENCLAW_TIMEOUT_SECONDS/);
  assert.doesNotMatch(bridge, /case 'openclaw':[\s\S]{0,500}'gateway'/);
});

test('Mac installs and diagnoses the bridge but does not consume local_openclaw by default', () => {
  assert.match(launchd, /com\.opsly\.bridge\.openclaw/);
  assert.match(launchd, /opsly:local-openclaw-service/);
  assert.match(doctor, /openclaw agent exec --help/);
  assert.match(doctor, /check_bridge_health 5012 openclaw/);

  const match = macWorker.match(/OPSLY_LOCAL_AGENT_KINDS="\$\{OPSLY_LOCAL_AGENT_KINDS:-([^}]+)\}"/);
  assert.ok(match);
  assert.doesNotMatch(match[1], /local_openclaw/);
});

test('OpenClaw bridge remains fail-closed behind Opsly auth and ephemeral tmux execution', () => {
  assert.match(bridge, /auth_required: true/);
  assert.match(bridge, /auth_configured: Boolean\(executeToken\)/);
  assert.match(bridge, /execution_model: 'ephemeral-tmux-session'/);
  assert.match(bridge, /createSession/);
  assert.match(bridge, /stopSession/);
});
