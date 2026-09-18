import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildFileAwareReviewContext,
  truncatePatchMiddle,
} from '../backend-review-context.mjs';

test('truncatePatchMiddle preserves both ends and marks omitted middle context', () => {
  const patch = [
    '@@ -1,3 +1,100 @@',
    '+BEGIN_CRITICAL_WORKFLOW',
    ...Array.from({ length: 200 }, (_, index) => `+middle-${index}`),
    '+bash scripts/deploy/promote-canary.sh --rollback-on-fail',
    '+END_CRITICAL_WORKFLOW',
  ].join('\n');

  const rendered = truncatePatchMiddle(patch, 900);
  assert.match(rendered, /BEGIN_CRITICAL_WORKFLOW/);
  assert.match(rendered, /promote-canary\.sh --rollback-on-fail/);
  assert.match(rendered, /omitted from middle of this file patch/);
});

test('file-aware context prioritizes workflows and never treats truncation marker as repository code', () => {
  const workflowPatch = [
    '@@ -1,3 +1,200 @@',
    '+name: Release',
    ...Array.from({ length: 300 }, (_, index) => `+workflow-line-${index}`),
    '+bash scripts/deploy/promote-canary.sh --staging-api-url "$STAGING_API_URL"',
  ].join('\n');

  const context = buildFileAwareReviewContext(
    [
      {
        filename: 'docs/notes.md',
        status: 'modified',
        additions: 1,
        deletions: 0,
        patch: '+documentation only',
      },
      {
        filename: '.github/workflows/promote-production-canary.yml',
        status: 'modified',
        additions: 200,
        deletions: 5,
        patch: workflowPatch,
      },
    ],
    { maxChars: 3_000 },
  );

  assert.ok(
    context.indexOf('.github/workflows/promote-production-canary.yml') <
      context.indexOf('docs/notes.md'),
  );
  assert.match(context, /promote-canary\.sh --staging-api-url/);
  assert.match(context, /reviewer-context metadata, not repository code/);
  assert.match(context, /never report those markers themselves as PR defects/);
  assert.ok(context.length <= 3_000);
});

test('missing GitHub patch is explicit evidence absence, not an invented code defect', () => {
  const context = buildFileAwareReviewContext(
    [{ filename: 'binary.dat', status: 'modified', additions: 0, deletions: 0, patch: null }],
    { maxChars: 1_500 },
  );

  assert.match(context, /Patch unavailable from GitHub API/);
  assert.match(context, /inspect the file directly before treating absence as a code defect/);
});
