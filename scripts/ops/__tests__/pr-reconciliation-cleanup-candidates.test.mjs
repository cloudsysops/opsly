import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = path.resolve(process.cwd());
const source = fs.readFileSync(
  path.join(root, 'scripts/ops/pr-reconciliation-cleanup-candidates.mjs'),
  'utf8'
);

test('cleanup inventory is read-only and never deletes branches', () => {
  assert.match(source, /mode: 'READ_ONLY'/);
  assert.match(source, /deleteBranches: false/);
  assert.doesNotMatch(source, /method:\s*['"]DELETE['"]/);
});

test('active PR heads and dependency bases block cleanup', () => {
  assert.match(source, /ACTIVE_PR_HEAD/);
  assert.match(source, /ACTIVE_PR_BASE/);
  assert.match(source, /activeHeads\.has\(name\)/);
  assert.match(source, /activeBases\.has\(name\)/);
});

test('requires a confirmed merged PR before cleanup candidacy', () => {
  assert.match(source, /NO_CONFIRMED_MERGED_PR/);
  assert.match(source, /Boolean\(merged\)/);
  assert.match(source, /pr\.merged_at/);
});

test('protected and default branches cannot become cleanup candidates', () => {
  assert.match(source, /PROTECTED_SURFACE/);
  assert.match(source, /DEFAULT_BRANCH/);
  assert.match(source, /!isDefault/);
  assert.match(source, /!protectedSurface/);
});
