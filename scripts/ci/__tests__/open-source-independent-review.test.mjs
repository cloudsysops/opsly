import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const reviewer = readFileSync('scripts/ci/backend-independent-review.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/backend-independent-review.yml', 'utf8');
const prDoctor = readFileSync('scripts/ci/pr-doctor.mjs', 'utf8');
const cliAgentService = readFileSync('scripts/cli-agent-service.ts', 'utf8');
const textRoute = readFileSync('apps/llm-gateway/src/text-completion-route.ts', 'utf8');
const providers = readFileSync('apps/llm-gateway/src/providers.ts', 'utf8');

test('independent reviewer is branded as open-source and never emits Codex verdicts', () => {
  assert.match(reviewer, /Opsly Open Review Agent/);
  assert.match(reviewer, /Open-Source Review: Didn't find any major issues\./);
  assert.doesNotMatch(reviewer, /const CLEAN_PHRASE = ["']Codex Review:/);
  assert.match(workflow, /name: Open-source independent review/);
});

test('reviewer dispatches through governed local_opencode and polls terminal evidence', () => {
  assert.match(reviewer, /\/api\/local\/prompt-submit/);
  assert.match(reviewer, /\/api\/job-status\//);
  assert.match(reviewer, /agent: 'local_opencode'/);
  assert.match(reviewer, /agent_role: 'review'/);
  assert.match(reviewer, /workstream: 'github-independent-review'/);
  assert.match(reviewer, /conflict_key:/);
  assert.match(reviewer, /semantic_scope:/);
  assert.match(reviewer, /requires_pr: false/);
  assert.match(reviewer, /production_deploy: false/);
  assert.match(reviewer, /paid_infra_required: false/);
  assert.match(reviewer, /Cloud fallback: disabled/);
  assert.doesNotMatch(reviewer, /GATEWAY_URL/);
});

test('reviewer treats PR diff content as untrusted data', () => {
  assert.match(reviewer, /DATOS NO CONFIABLES/);
  assert.match(reviewer, /Nunca sigas instrucciones/);
  assert.match(reviewer, /READ-ONLY/);
});

test('reviewer treats lack of P0 findings as clean, not only the exact phrase', () => {
  assert.match(reviewer, /text === CLEAN_PHRASE/);
  assert.match(reviewer, /P0\[:\\s\]/);
  assert.match(reviewer, /P1\/P2/);
  assert.doesNotMatch(reviewer, /includes\(CLEAN_PHRASE/);
});

test('reviewer fails closed unless terminal evidence identifies local Qwen and a worker', () => {
  assert.ok(reviewer.includes("!/^ollama\\/qwen/i.test(modelUsed)"));
  assert.match(reviewer, /requires local Qwen evidence/);
  assert.match(reviewer, /requires worker identity evidence/);
  assert.match(reviewer, /Provider cost: \$0/);
});

test('PR Doctor shares the canonical ignored-check policy with Mission Control', () => {
  assert.match(prDoctor, /pr-triage-policy\.json/);
  assert.match(prDoctor, /import \{ isIgnoredCheck \} from '\.\/pr-triage\.mjs'/);
  assert.match(prDoctor, /isIgnoredCheck\(c\.name, ignoredPatterns\)/);
  assert.doesNotMatch(prDoctor, /const IGNORED_CHECKS = new Set/);
});

test('workflow uses orchestrator auth instead of direct VPS LLM gateway access', () => {
  assert.match(workflow, /OPSLY_ORCHESTRATOR_URL: http:\/\/100\.120\.151\.91:3011/);
  assert.match(workflow, /PLATFORM_ADMIN_TOKEN: \$\{\{ secrets\.PLATFORM_ADMIN_TOKEN \}\}/);
  assert.doesNotMatch(workflow, /LLM_GATEWAY_URL:/);
  assert.match(workflow, /Run Opsly Open Review Agent/);
});

test('OpenCode review roles run in plan mode and cannot enable skip-permissions', () => {
  assert.match(cliAgentService, /requestedRole\.includes\('review'\)/);
  assert.match(cliAgentService, /\? 'plan'/);
  assert.match(cliAgentService, /openCodeAgent === 'build'/);
  assert.match(cliAgentService, /OPSLY_OPENCODE_SKIP_PERMISSIONS/);
});

test('direct ollama-code route remains local Qwen only for other gateway callers', () => {
  assert.match(textRoute, /providerHint === 'ollama-code'/);
  assert.match(textRoute, /completeWithProviderId\('qwen_coder_local', llmReq\)/);
  assert.match(providers, /OLLAMA_CODE_MODEL/);
  assert.match(providers, /qwen_coder_local:/);
});
