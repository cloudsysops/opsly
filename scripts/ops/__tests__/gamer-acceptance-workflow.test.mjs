import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const workflow = readFileSync(
  path.join(root, '.github/workflows/gamer-opencode-physical-acceptance.yml'),
  'utf8'
);
const workpack = readFileSync(
  path.join(root, 'docs/01-development/night-queue/050-gamer-opencode-physical-acceptance.md'),
  'utf8'
);
const hotfix = readFileSync(
  path.join(root, '.github/workflows/hotfix-pc-gamer-probe-once.yml'),
  'utf8'
);

describe('gamer physical acceptance workflow topology', () => {
  it('targets WSL MagicDNS and separates Windows host', () => {
    assert.match(workflow, /GAMER_WORKER_HOST:\s*smdqcia-wsl/);
    assert.match(workflow, /GAMER_WINDOWS_HOST:\s*smdqcia-pc/);
    assert.match(workflow, /Fail when Gamer WSL worker is unavailable/);
    assert.match(workflow, /exit 1/);
    assert.doesNotMatch(workflow, /PC_GAMER_OFFLINE_DEFERRED/);
  });

  it('does not use legacy pc-gamer IP as operational curl/peer target', () => {
    assert.doesNotMatch(workflow, /curl[^\n]*100\.74\.88\.103/);
    assert.match(workflow, /http_get\(\)/);
    assert.match(workflow, /GAMER_HTTP_GET_BIN/);
    assert.doesNotMatch(workflow, /TailscaleIPs\[\]\?; \. == "100\.74\.88\.103"/);
    assert.match(workflow, /legacy_pc_gamer=100\.74\.88\.103 \(retired; not probed\)/);
  });

  it('enforces Qwen coder model contract without installing models', () => {
    assert.match(workflow, /qwen3-coder/);
    assert.match(workflow, /qwen2\.5-coder/);
    assert.match(workflow, /Do not install models from CI/);
    assert.match(workpack, /qwen3-coder/);
    assert.match(workpack, /qwen2\.5-coder/);
    assert.match(workpack, /smdqcia-wsl/);
  });

  it('hotfix probe labels legacy IP as non-operational', () => {
    assert.match(hotfix, /probe home-gpu-01-wsl smdqcia-wsl/);
    assert.match(hotfix, /LEGACY-offline-pc-gamer 100\.74\.88\.103/);
  });

  it('treats HTTP health or DERP pong as online (not direct-only ping exit)', () => {
    assert.match(workflow, /http_health/);
    assert.match(workflow, /pong from/);
    assert.match(workflow, /direct connection not established/);
    assert.match(workflow, /tailscale_pong_derp_ok/);
  });
});
