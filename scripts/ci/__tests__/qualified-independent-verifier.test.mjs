import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import {
  evaluateQualifiedIndependentReview,
} from '../check-independent-review.mjs';
import {
  extractStructuredVerifierEvidence,
  pathMatchesPattern,
  requiredVerifierPolicy,
  signRuntimeVerifierEvidence,
} from '../lib/independent-verifier-policy.mjs';

const head = '9491d6028d1234567890abcdefabcdefabcdef12';
const policy = JSON.parse(
  await fs.readFile(
    new URL('../../../config/independent-verifier-policy.json', import.meta.url),
    'utf8'
  )
);

let reviewId = 0;
function cleanReview(login, commitId = head, body = "Codex Review: Didn't find any major issues.") {
  reviewId += 1;
  return {
    id: reviewId,
    state: 'COMMENTED',
    commit_id: commitId,
    submitted_at: '2026-09-14T16:00:00Z',
    user: { login },
    author_association: 'NONE',
    body,
  };
}

test('normal changes pass with one qualified independent verifier', () => {
  const decision = evaluateQualifiedIndependentReview({
    headSha: head,
    author: 'builder-user',
    reviews: [cleanReview('chatgpt-codex-connector[bot]')],
    files: [{ filename: 'docs/README.md' }],
    policy,
  });

  assert.equal(decision.ok, true);
  assert.equal(decision.status, 'PASS');
  assert.equal(decision.risk, 'NORMAL');
  assert.equal(decision.required_quorum, 1);
  assert.equal(decision.observed_quorum, 1);
});

test('sensitive verifier changes require two independent verifier groups', () => {
  const files = [{ filename: 'scripts/ci/check-independent-review.mjs' }];

  const one = evaluateQualifiedIndependentReview({
    headSha: head,
    author: 'builder-user',
    reviews: [cleanReview('chatgpt-codex-connector[bot]')],
    files,
    policy,
  });

  assert.equal(one.ok, false);
  assert.equal(one.status, 'BLOCKED');
  assert.equal(one.risk, 'SENSITIVE');
  assert.equal(one.required_quorum, 2);
  assert.equal(one.observed_quorum, 1);

  const two = evaluateQualifiedIndependentReview({
    headSha: head,
    author: 'builder-user',
    reviews: [
      cleanReview('chatgpt-codex-connector[bot]'),
      cleanReview(
        'copilot-pull-request-reviewer[bot]',
        head,
        'No unresolved review issues were identified.'
      ),
    ],
    files,
    policy,
  });

  assert.equal(two.ok, true);
  assert.equal(two.status, 'PASS');
  assert.equal(two.observed_quorum, 2);
  assert.deepEqual(
    new Set(two.verifier_groups),
    new Set(['openai-codex', 'github-copilot'])
  );
});

test('two logins from the same independence group count only once', () => {
  const decision = evaluateQualifiedIndependentReview({
    headSha: head,
    author: 'builder-user',
    reviews: [
      cleanReview(
        'github-copilot[bot]',
        head,
        'No unresolved review issues were identified.'
      ),
      cleanReview(
        'copilot-pull-request-reviewer[bot]',
        head,
        'No unresolved review issues were identified.'
      ),
    ],
    files: [{ filename: '.github/workflows/ci.yml' }],
    policy,
  });

  assert.equal(decision.ok, false);
  assert.equal(decision.required_quorum, 2);
  assert.equal(decision.observed_quorum, 1);
});

test('builder cannot certify its own change', () => {
  const decision = evaluateQualifiedIndependentReview({
    headSha: head,
    author: 'chatgpt-codex-connector[bot]',
    reviews: [cleanReview('chatgpt-codex-connector[bot]')],
    files: [{ filename: 'docs/README.md' }],
    policy,
  });

  assert.equal(decision.ok, false);
  assert.equal(decision.status, 'BLOCKED');
  assert.equal(decision.observed_quorum, 0);
});

test('qualified structured FAIL blocks even when another verifier is clean', () => {
  const marker = [
    '<!-- opsly-independent-verifier-v1',
    JSON.stringify({
      schema_version: 'IndependentVerifierEvidenceV1',
      head_sha: head,
      decision: 'FAIL',
      specialties_checked: ['security', 'ci'],
      findings: ['P1 verifier can certify stale evidence'],
      checks: ['diff'],
      reviewed_at: '2026-09-14T16:00:00Z',
    }),
    '-->',
  ].join('\n');

  const decision = evaluateQualifiedIndependentReview({
    headSha: head,
    author: 'builder-user',
    reviews: [
      cleanReview('chatgpt-codex-connector[bot]', head, marker),
      cleanReview(
        'copilot-pull-request-reviewer[bot]',
        head,
        'No unresolved review issues were identified.'
      ),
    ],
    files: [{ filename: 'docs/README.md' }],
    policy,
  });

  assert.equal(decision.ok, false);
  assert.equal(decision.status, 'FAIL');
  assert.match(decision.reason, /chatgpt-codex-connector/);
});

test('stale structured verifier evidence does not count', () => {
  const marker = [
    '<!-- opsly-independent-verifier-v1',
    JSON.stringify({
      schema_version: 'IndependentVerifierEvidenceV1',
      head_sha: '1111111111111111111111111111111111111111',
      decision: 'PASS',
      findings: [],
      checks: ['diff'],
      reviewed_at: '2026-09-14T16:00:00Z',
    }),
    '-->',
  ].join('\n');

  const decision = evaluateQualifiedIndependentReview({
    headSha: head,
    author: 'builder-user',
    issueComments: [
      {
        id: 1,
        created_at: '2026-09-14T16:00:00Z',
        user: { login: 'chatgpt-codex-connector[bot]' },
        author_association: 'NONE',
        body: marker,
      },
    ],
    files: [{ filename: 'docs/README.md' }],
    policy,
  });

  assert.equal(decision.ok, false);
  assert.equal(decision.observed_quorum, 0);
});

test('trusted human approval is normal-only breakglass, not sensitive quorum', () => {
  const human = {
    id: 9,
    state: 'APPROVED',
    commit_id: head,
    submitted_at: '2026-09-14T16:00:00Z',
    user: { login: 'trusted-human' },
    author_association: 'MEMBER',
    body: '',
  };

  const normal = evaluateQualifiedIndependentReview({
    headSha: head,
    author: 'builder-user',
    reviews: [human],
    files: [{ filename: 'docs/README.md' }],
    policy,
  });
  assert.equal(normal.ok, true);
  assert.match(normal.reason, /human_breakglass/);

  const sensitive = evaluateQualifiedIndependentReview({
    headSha: head,
    author: 'builder-user',
    reviews: [human],
    files: [{ filename: 'config/independent-verifier-policy.json' }],
    policy,
  });
  assert.equal(sensitive.ok, false);
  assert.equal(sensitive.status, 'BLOCKED');
});

test('sensitivity patterns cover workflows, auth, migrations, n8n, and Peskids', () => {
  for (const file of [
    '.github/workflows/ci.yml',
    'apps/api/lib/auth/admin.ts',
    'supabase/migrations/123.sql',
    'n8n/workflows/hot-lead.json',
    'apps/peskids/app/api/enroll/route.ts',
  ]) {
    const requirement = requiredVerifierPolicy([{ filename: file }], policy);
    assert.equal(requirement.sensitive, true, file);
    assert.ok(requirement.quorum >= 2, file);
  }

  assert.equal(pathMatchesPattern('docs/README.md', '.github/workflows/**'), false);
});

test('structured evidence marker parses only the canonical schema', () => {
  const body = [
    '<!-- opsly-independent-verifier-v1',
    JSON.stringify({
      schema_version: 'IndependentVerifierEvidenceV1',
      head_sha: head,
      decision: 'PASS',
      findings: [],
    }),
    '-->',
  ].join('\n');

  assert.equal(extractStructuredVerifierEvidence(body)?.decision, 'PASS');
  assert.equal(
    extractStructuredVerifierEvidence(
      '<!-- opsly-independent-verifier-v1 {"schema_version":"Wrong"} -->'
    ),
    null
  );
});


test('signed Claude runtime plus Copilot satisfies sensitive quorum', () => {
  const key = 'test-signing-key';
  const runtimeEvidence = {
    schema_version: 'IndependentVerifierEvidenceV1',
    head_sha: head,
    decision: 'PASS',
    verifier_agent: 'claude-code',
    builder_agent: 'opencode',
    execution_id: 'exec-claude-1',
    specialties_checked: ['architecture', 'security', 'ci', 'ownership', 'blast-radius'],
    findings: [],
    checks: ['diff', 'CI', 'security'],
    reviewed_at: '2026-09-14T16:30:00Z',
  };
  runtimeEvidence.signature = signRuntimeVerifierEvidence(runtimeEvidence, key);

  const marker = [
    '<!-- opsly-independent-verifier-v1',
    JSON.stringify(runtimeEvidence),
    '-->',
  ].join('\n');

  const decision = evaluateQualifiedIndependentReview({
    headSha: head,
    author: 'builder-user',
    reviews: [
      cleanReview(
        'copilot-pull-request-reviewer[bot]',
        head,
        'No unresolved review issues were identified.'
      ),
    ],
    issueComments: [
      {
        id: 501,
        created_at: '2026-09-14T16:30:00Z',
        user: { login: 'trusted-relay' },
        author_association: 'OWNER',
        body: marker,
      },
    ],
    files: [{ filename: 'scripts/ci/check-independent-review.mjs' }],
    policy,
    runtimeSigningKey: key,
  });

  assert.equal(decision.ok, true);
  assert.equal(decision.status, 'PASS');
  assert.equal(decision.observed_quorum, 2);
  assert.deepEqual(
    new Set(decision.verifier_groups),
    new Set(['anthropic-claude', 'github-copilot'])
  );
});

test('invalid runtime signature does not satisfy verifier quorum', () => {
  const runtimeEvidence = {
    schema_version: 'IndependentVerifierEvidenceV1',
    head_sha: head,
    decision: 'PASS',
    verifier_agent: 'claude-code',
    builder_agent: 'opencode',
    execution_id: 'exec-claude-bad',
    specialties_checked: ['architecture', 'security', 'ci', 'ownership', 'blast-radius'],
    findings: [],
    checks: ['diff'],
    reviewed_at: '2026-09-14T16:31:00Z',
    signature: '0'.repeat(64),
  };

  const marker = [
    '<!-- opsly-independent-verifier-v1',
    JSON.stringify(runtimeEvidence),
    '-->',
  ].join('\n');

  const decision = evaluateQualifiedIndependentReview({
    headSha: head,
    author: 'builder-user',
    reviews: [
      cleanReview(
        'copilot-pull-request-reviewer[bot]',
        head,
        'No unresolved review issues were identified.'
      ),
    ],
    issueComments: [
      {
        id: 502,
        created_at: '2026-09-14T16:31:00Z',
        user: { login: 'trusted-relay' },
        author_association: 'OWNER',
        body: marker,
      },
    ],
    files: [{ filename: 'scripts/ci/check-independent-review.mjs' }],
    policy,
    runtimeSigningKey: 'real-key',
  });

  assert.equal(decision.ok, false);
  assert.equal(decision.status, 'BLOCKED');
  assert.equal(decision.observed_quorum, 1);
});

test('signed runtime self-review does not count', () => {
  const key = 'test-signing-key';
  const runtimeEvidence = {
    schema_version: 'IndependentVerifierEvidenceV1',
    head_sha: head,
    decision: 'PASS',
    verifier_agent: 'claude-code',
    builder_agent: 'claude-code',
    execution_id: 'exec-self-review',
    specialties_checked: ['architecture', 'security', 'ci', 'ownership', 'blast-radius'],
    findings: [],
    checks: ['diff'],
    reviewed_at: '2026-09-14T16:32:00Z',
  };
  runtimeEvidence.signature = signRuntimeVerifierEvidence(runtimeEvidence, key);

  const marker = [
    '<!-- opsly-independent-verifier-v1',
    JSON.stringify(runtimeEvidence),
    '-->',
  ].join('\n');

  const decision = evaluateQualifiedIndependentReview({
    headSha: head,
    author: 'builder-user',
    issueComments: [
      {
        id: 503,
        created_at: '2026-09-14T16:32:00Z',
        user: { login: 'trusted-relay' },
        author_association: 'OWNER',
        body: marker,
      },
    ],
    files: [{ filename: 'docs/README.md' }],
    policy,
    runtimeSigningKey: key,
  });

  assert.equal(decision.ok, false);
  assert.equal(decision.observed_quorum, 0);
});
