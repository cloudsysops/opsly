import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const scriptFile = new URL('../pc-gamer-opencode-plane.sh', import.meta.url);

test('PC Gamer OpenCode plane is local-first and model-discovering', async () => {
  const source = await readFile(scriptFile, 'utf8');
  assert.match(source, /OPSLY_LOCAL_MODEL_PREFERENCE/);
  assert.match(source, /\/api\/tags/);
  assert.match(source, /resolve_local_model/);
  assert.match(source, /OPSLY_OPENCODE_MODEL="$selected_model"/);
  assert.match(source, /OLLAMA_URL="$OLLAMA_URL"/);
  assert.doesNotMatch(source, /Environment=OPSLY_OPENCODE_MODEL=ollama\/llama3\.2/);
});

test('doctor verifies Ollama, OpenCode, model inventory and worker env', async () => {
  const source = await readFile(scriptFile, 'utf8');
  assert.match(source, /LOCAL_FIRST_READY/);
  assert.match(source, /OpenCode binary/);
  assert.match(source, /no Ollama model available/);
  assert.match(source, /worker env present/);
});

test('pulling a model is explicit, never automatic during normal up', async () => {
  const source = await readFile(scriptFile, 'utf8');
  assert.match(source, /--pull-model=/);
  assert.match(source, /ollama pull "$PULL_MODEL"/);
  assert.doesNotMatch(source, /ollama pull qwen3-coder/);
});


test('PC Gamer OpenCode bridge lifecycle is systemd-managed and contains no nohup fallback', async () => {
  const source = await readFile(scriptFile, 'utf8');
  assert.match(source, /systemctl --user (restart|enable --now) opsly-pc-gamer-opencode\.service/);
  assert.match(source, /EnvironmentFile=/);
  assert.match(source, /chmod 600 "\$env_file"/);
  assert.match(source, /managed OpenCode bridge service active/);
  assert.match(source, /auth_configured===true/);
  assert.match(source, /execution_model==="ephemeral-tmux-session"/);
  assert.doesNotMatch(source, /\bnohup\b/);
  assert.doesNotMatch(source, /\bdisown\b/);
  assert.doesNotMatch(source, /pkill -f/);
});


test('PC Gamer bridge stays loopback-only because worker uses host networking', async () => {
  const source = await readFile(scriptFile, 'utf8');
  assert.match(source, /OPENCODE_BIND="\$\{OPSLY_OPENCODE_BIND:-127\.0\.0\.1\}"/);
  assert.match(source, /bridge is loopback-only/);
  assert.match(source, /bridge must stay loopback-only/);
  assert.doesNotMatch(source, /set OPSLY_OPENCODE_BIND to the Gamer Tailscale IP/);
});


test('GPU proof uses Ollama process VRAM evidence without loading a model', async () => {
  const source = await readFile(scriptFile, 'utf8');
  assert.match(source, /--gpu-proof/);
  assert.match(source, /\/api\/ps/);
  assert.match(source, /size_vram/);
  assert.match(source, /GAMER_OLLAMA_GPU_ACTIVE/);
  assert.doesNotMatch(source, /gpu_proof\(\)[\s\S]{0,1200}ollama pull/);
});
