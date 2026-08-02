import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContract, buildAgentBrief } from '../agent-context-contract.mjs';

test('accepts the canonical contract and exposes bounded defaults', async () => {
  const result = await validateContract();

  assert.equal(result.valid, true);
  assert.ok(result.contract.defaults.max_context_tokens <= 12000);
  assert.ok(result.contract.defaults.max_output_tokens <= 1600);
  assert.ok(result.contract.defaults.max_auto_loaded_skills <= 3);
});

test('builds a compact provider-neutral brief', async () => {
  const brief = await buildAgentBrief({
    agent: 'codex',
    task: 'revisar una ruta API y sus pruebas',
  });

  assert.equal(brief.agent, 'codex');
  assert.equal(brief.requirements.gateway, true);
  assert.ok(brief.skills.includes('opsly-context'));
  assert.ok(brief.skills.includes('opsly-api'));
  assert.ok(brief.skills.length <= 3);
  assert.equal(brief.skill_files.length, brief.skills.length);
  assert.ok(brief.prompt.includes('No cargues todo el repositorio'));
});

test('rejects contracts that allow unbounded automatic skill loading', async () => {
  const invalid = await validateContract({
    defaults: { max_auto_loaded_skills: 4 },
  });

  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((error) => error.includes('max_auto_loaded_skills')));
});
