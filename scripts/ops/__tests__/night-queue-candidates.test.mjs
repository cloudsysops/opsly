import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter, toBackgroundCandidate } from '../night-queue-candidates.mjs';

test('parses frontmatter and maps a pending workpack', () => {
  const c = toBackgroundCandidate('100-test.md', `---
id: demo-100
status: pending
priority: 1
agent: local_codex
requires_pr: true
estimated_minutes: 12
---
Investigate CI failure and propose the smallest fix.
`);
  assert.equal(c.id, 'demo-100');
  assert.equal(c.priority, 'P1');
  assert.equal(c.runtime, 'codex');
  assert.equal(c.requiresPr, true);
  assert.equal(c.estimatedMinutes, 12);
});

test('held tasks are marked blocked', () => {
  const c = toBackgroundCandidate('held.md', `---
status: held
---
Do later.
`);
  assert.equal(c.blocked, true);
});

test('parser preserves body outside frontmatter', () => {
  const parsed = parseFrontmatter(`---
status: pending
---
Hello world
`);
  assert.equal(parsed.frontmatter.status, 'pending');
  assert.equal(parsed.body, 'Hello world');
});
