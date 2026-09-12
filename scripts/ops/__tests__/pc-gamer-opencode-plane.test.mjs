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
