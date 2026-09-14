#!/usr/bin/env node
import fs from 'node:fs/promises';

import {
  signRuntimeVerifierEvidence,
} from '../ci/lib/independent-verifier-policy.mjs';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error(
    'Usage: node scripts/ops/sign-independent-verifier-evidence.mjs <evidence.json>'
  );
  process.exit(1);
}

const key = process.env.SIERRA_VERIFIER_SIGNING_KEY?.trim();
if (!key) {
  throw new Error('SIERRA_VERIFIER_SIGNING_KEY is required');
}

const evidence = JSON.parse(await fs.readFile(inputPath, 'utf8'));

if (evidence?.schema_version !== 'IndependentVerifierEvidenceV1') {
  throw new Error('invalid verifier evidence schema');
}
if (!/^[0-9a-f]{40}$/i.test(String(evidence.head_sha || ''))) {
  throw new Error('head_sha must be the exact 40-character PR head SHA');
}
if (!['PASS', 'FAIL', 'BLOCKED'].includes(String(evidence.decision || '').toUpperCase())) {
  throw new Error('decision must be PASS, FAIL, or BLOCKED');
}
if (!String(evidence.verifier_agent || '').trim()) {
  throw new Error('verifier_agent is required');
}
if (!String(evidence.builder_agent || '').trim()) {
  throw new Error('builder_agent is required');
}
if (evidence.verifier_agent === evidence.builder_agent) {
  throw new Error('independent verifier cannot equal builder_agent');
}
if (!String(evidence.execution_id || '').trim()) {
  throw new Error('execution_id is required');
}
if (!String(evidence.reviewed_at || '').trim()) {
  throw new Error('reviewed_at is required');
}

const signed = {
  ...evidence,
  decision: String(evidence.decision).toUpperCase(),
};
signed.signature = signRuntimeVerifierEvidence(signed, key);

process.stdout.write(
  [
    '<!-- opsly-independent-verifier-v1',
    JSON.stringify(signed, null, 2),
    '-->',
    '',
  ].join('\n')
);
