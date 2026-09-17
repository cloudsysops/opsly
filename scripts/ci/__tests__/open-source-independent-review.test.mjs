import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const reviewer = readFileSync('scripts/ci/backend-independent-review.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/backend-independent-review.yml', 'utf8');
const budgets = readFileSync('apps/llm-gateway/src/config/budgets.ts', 'utf8');
const providerHints = readFileSync('apps/llm-gateway/src/parse-provider-hint.ts', 'utf8');
const textRoute = readFileSync('apps/llm-gateway/src/text-completion-route.ts', 'utf8');
const providers = readFileSync('apps/llm-gateway/src/providers.ts', 'utf8');

test('independent reviewer is branded as open-source and never emits Codex verdicts', () => {
  assert.match(reviewer, /Opsly Open Review Agent/);
  assert.match(reviewer, /Open-Source Review: Didn't find any major issues\./);
  assert.doesNotMatch(reviewer, /const CLEAN_PHRASE = ["']Codex Review:/);
  assert.match(workflow, /name: Open-source independent review/);
});

test('reviewer requests explicit local code route and zero-cost evidence', () => {
  assert.match(reviewer, /provider_hint: 'ollama-code'/);
  assert.match(reviewer, /opsly-ci-open-source-review/);
  assert.match(reviewer, /reportedCost !== 0/);
  assert.match(reviewer, /Cloud fallback: disabled/);
});

test('review tenant is fail-closed local-only', () => {
  assert.match(budgets, /'opsly-ci-open-source-review': 'free-always'/);
  assert.match(providerHints, /raw === 'ollama-code'/);
});

test('ollama-code bypasses cloud chains and targets codellama_local directly', () => {
  assert.match(textRoute, /providerHint === 'ollama-code'/);
  assert.match(textRoute, /completeWithProviderId\('codellama_local', llmReq\)/);
  assert.match(providers, /OLLAMA_CODE_MODEL/);
  assert.match(providers, /'codellama:7b'/);
});

test('workflow pins the dedicated local-only review tenant', () => {
  assert.match(workflow, /OPSLY_REVIEW_TENANT: opsly-ci-open-source-review/);
  assert.match(workflow, /Run Opsly Open Review Agent/);
});
