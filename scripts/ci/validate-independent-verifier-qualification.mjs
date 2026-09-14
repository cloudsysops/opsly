#!/usr/bin/env node
import fs from 'node:fs/promises';

const policyPath = process.argv[2] || 'config/independent-verifier-policy.json';
const evalPath = process.argv[3] || 'config/independent-verifier-evals.json';

const [policy, suite] = await Promise.all([
  fs.readFile(policyPath, 'utf8').then(JSON.parse),
  fs.readFile(evalPath, 'utf8').then(JSON.parse),
]);

const errors = [];

if (policy?.schema_version !== 'IndependentVerifierPolicyV1') {
  errors.push('invalid policy schema');
}
if (suite?.schema_version !== 'IndependentVerifierEvalSuiteV1') {
  errors.push('invalid eval-suite schema');
}
if (!Array.isArray(suite?.cases) || suite.cases.length < 8) {
  errors.push('verifier eval suite must include at least 8 cases');
}

const requiredCategories = new Set([
  'evidence-integrity',
  'independence',
  'review-quality',
  'quorum',
  'attestation',
  'fail-closed',
]);
for (const item of suite?.cases ?? []) {
  requiredCategories.delete(item.category);
  if (!['PASS', 'FAIL', 'BLOCKED'].includes(item.expected_decision)) {
    errors.push('invalid expected_decision for ' + String(item.id));
  }
}
if (requiredCategories.size > 0) {
  errors.push('missing eval categories: ' + [...requiredCategories].join(','));
}

for (const [login, profile] of Object.entries(policy?.verifier_profiles ?? {})) {
  if (!profile.profile_id || !profile.agent_id || !profile.independence_group) {
    errors.push('incomplete GitHub verifier profile: ' + login);
  }
  if (profile.trust_level !== 'trusted') {
    errors.push('GitHub verifier must be trusted before qualification: ' + login);
  }
  if (!Array.isArray(profile.specialties) || profile.specialties.length === 0) {
    errors.push('GitHub verifier has no specialties: ' + login);
  }
}

for (const [id, profile] of Object.entries(policy?.runtime_verifier_profiles ?? {})) {
  if (!profile.profile_id || !profile.agent_id || !profile.independence_group) {
    errors.push('incomplete runtime verifier profile: ' + id);
  }
  if (profile.trust_level !== 'trusted') {
    errors.push('runtime verifier must be trusted before qualification: ' + id);
  }
  if (!Array.isArray(profile.specialties) || profile.specialties.length === 0) {
    errors.push('runtime verifier has no specialties: ' + id);
  }
}

if (errors.length > 0) {
  console.error('SIERRA_VERIFIER_QUALIFICATION=FAIL');
  for (const error of errors) console.error(error);
  process.exit(1);
}

console.log(
  JSON.stringify({
    status: 'PASS',
    policy: policy.schema_version,
    eval_suite: suite.version,
    eval_cases: suite.cases.length,
    github_profiles: Object.keys(policy.verifier_profiles ?? {}).length,
    runtime_profiles: Object.keys(policy.runtime_verifier_profiles ?? {}).length,
  })
);
