import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classifyVerdict } from '../review-verdict.mjs';

const CLEAN = "Open-Source Review: Didn't find any major issues.";

test('exact clean phrase is clean', () => {
  assert.equal(classifyVerdict(CLEAN, CLEAN), 'clean');
  assert.equal(classifyVerdict(`\n  ${CLEAN}  \n`, CLEAN), 'clean');
});

test('findings with only P1/P2 are non-blocking notes', () => {
  assert.equal(classifyVerdict('P1 resume.ts:130 falta test\nP2 nombre confuso', CLEAN), 'notes');
});

test('any P0 finding is blocking', () => {
  assert.equal(classifyVerdict('P2 nit\nP0 store.ts:34 pierde datos', CLEAN), 'blocking');
  assert.equal(classifyVerdict('- P0: inyección en resume.ts', CLEAN), 'blocking');
});

// Real verdicts that were published as APPROVE + success on PR #1713.
test('the "Plan Mode" non-answer is invalid, not an approval', () => {
  const planMode =
    "I appreciate this being activated, but I'd like to clarify before we proceed: **What specific task or goal would you like me to plan for?**";
  assert.equal(classifyVerdict(planMode, CLEAN), 'invalid');
});

test('an off-topic answer about another project is invalid', () => {
  const offTopic =
    '# 🚀 Battle6 Landing App - Plan Mode: System Ready\n\nI\'m currently in READ-ONLY phase for the Battle6 landing app...';
  assert.equal(classifyVerdict(offTopic, CLEAN), 'invalid');
});

test('a preamble before the findings fails closed', () => {
  assert.equal(classifyVerdict('Here is my review:\nP2 nit', CLEAN), 'invalid');
});

test('empty, null and undefined are invalid', () => {
  for (const v of ['', '   \n ', null, undefined]) {
    assert.equal(classifyVerdict(v, CLEAN), 'invalid');
  }
});

test('words that merely start with P0/P1 are not findings', () => {
  assert.equal(classifyVerdict('P0wer user note', CLEAN), 'invalid');
  assert.equal(classifyVerdict('P1ease check', CLEAN), 'invalid');
});

test('the reviewer script refuses to post an invalid verdict', () => {
  const reviewer = readFileSync('scripts/ci/backend-independent-review.mjs', 'utf8');
  assert.match(reviewer, /classifyVerdict\(verdict, CLEAN_PHRASE\) === 'invalid'/);
  const guard = reviewer.indexOf("=== 'invalid'");
  const post = reviewer.indexOf('await submitReview(pr, verdict');
  assert.ok(guard > 0 && post > guard, 'invalid-verdict guard must come before submitReview');
});
