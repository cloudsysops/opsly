#!/usr/bin/env node
const [pr, head, author = 'UNKNOWN'] = process.argv.slice(2);

if (!pr || !/^[0-9a-f]{40}$/i.test(head || '')) {
  console.error('Usage: node scripts/ops/independent-verifier-workpack.mjs <PR_NUMBER> <40-char HEAD_SHA> [AUTHOR]');
  process.exit(1);
}

const marker = {
  schema_version: 'IndependentVerifierEvidenceV1',
  head_sha: head,
  decision: 'BLOCKED',
  specialties_checked: ['architecture', 'security', 'ci', 'ownership', 'blast-radius'],
  findings: [],
  checks: [],
  reviewed_at: new Date().toISOString(),
};

console.log([
  '# Sierra Independent Verifier workpack',
  '',
  'PR: #' + pr,
  'Exact head SHA: ' + head,
  'Builder/PR author: ' + author,
  '',
  'Use the sierra-independent-verifier skill.',
  'Read-only. Do not edit/push/merge/deploy.',
  'Verify architecture, security, CI/tests, ownership/concurrency, blast radius, and evidence integrity.',
  'If you are the builder, return BLOCKED.',
  '',
  'Required handback marker:',
  '<!-- opsly-independent-verifier-v1',
  JSON.stringify(marker, null, 2),
  '-->',
].join('\n'));
