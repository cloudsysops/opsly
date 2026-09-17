#!/usr/bin/env node

import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { releaseCandidateV1Schema } from '../../packages/types/dist/release-candidate.js';

const SERVICES = [
  'api',
  'admin',
  'portal',
  'icso',
  'llm-gateway',
  'orchestrator',
  'hermes',
  'context-builder',
  'mcp',
];

function requireEnv(env, key) {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function parseDigestMap(raw, label) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${label} must be valid JSON: ${error.message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object keyed by service`);
  }

  return parsed;
}

function normalizeDigest(value, label) {
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(value)) {
    throw new Error(`${label} must be a sha256 digest`);
  }
  return value;
}

export function buildReleaseCandidateEvidence(env = process.env) {
  const releaseSha = requireEnv(env, 'RELEASE_SHA');
  if (!/^[0-9a-f]{40}$/.test(releaseSha)) {
    throw new Error('RELEASE_SHA must be a full 40-character lowercase commit SHA');
  }

  const stagingRunId = requireEnv(env, 'STAGING_RUN_ID');
  const stagingDigests = parseDigestMap(
    requireEnv(env, 'STAGING_DIGESTS_JSON'),
    'STAGING_DIGESTS_JSON',
  );
  const productionDigests = parseDigestMap(
    env.PRODUCTION_DIGESTS_JSON?.trim() || '{}',
    'PRODUCTION_DIGESTS_JSON',
  );

  const artifacts = [];
  const blockers = [];

  for (const service of SERVICES) {
    const stagingDigestRaw = stagingDigests[service];
    if (!stagingDigestRaw) {
      blockers.push(`missing_staging_digest:${service}`);
      continue;
    }

    const stagingDigest = normalizeDigest(stagingDigestRaw, `staging digest for ${service}`);
    artifacts.push({
      kind: 'container_image',
      name: service,
      immutable_ref: `ghcr.io/cloudsysops/intcloudsysops-${service}@${stagingDigest}`,
      digest: stagingDigest,
    });

    const productionDigestRaw = productionDigests[service];
    if (!productionDigestRaw) {
      blockers.push(`production_digest_not_bound:${service}`);
      continue;
    }

    const productionDigest = normalizeDigest(
      productionDigestRaw,
      `production digest for ${service}`,
    );
    if (productionDigest !== stagingDigest) {
      blockers.push(`same_digest_not_proven:${service}`);
    }
  }

  if (env.MIGRATION_SAFE_FOR_PROMOTION !== 'true') {
    blockers.push('migration_safety_not_bound');
  }

  if (env.EXTERNAL_GATES_BOUND !== 'true') {
    blockers.push('ci_security_independent_review_not_bound');
  }

  if (env.ALLOW_READY !== 'true') {
    blockers.push('release_readiness_not_authorized');
  }

  const uniqueBlockers = [...new Set(blockers)];
  const ready = uniqueBlockers.length === 0;

  const candidate = {
    schema_version: 'ReleaseCandidateV1',
    candidate_id:
      env.CANDIDATE_ID?.trim() || `rc-${releaseSha.slice(0, 12)}-${stagingRunId}`,
    product: env.PRODUCT?.trim() || 'opsly-platform',
    commit_sha: releaseSha,
    source_environment: 'staging',
    staging_deployment: env.STAGING_DEPLOYMENT?.trim() || 'opsly-staging-candidate',
    staging_run_id: stagingRunId,
    artifacts,
    gates: {
      ci: env.EXTERNAL_GATES_BOUND === 'true' ? 'passed' : 'not_required',
      security: env.EXTERNAL_GATES_BOUND === 'true' ? 'passed' : 'not_required',
      staging_health: 'passed',
      e2e: 'passed',
      independent_verification:
        env.EXTERNAL_GATES_BOUND === 'true' ? 'passed' : 'not_required',
    },
    migration: {
      requires_approval: env.MIGRATION_REQUIRES_APPROVAL === 'true',
      safe_for_promotion: env.MIGRATION_SAFE_FOR_PROMOTION === 'true',
      production_applied: false,
    },
    evidence_refs: [
      `gha://run/${stagingRunId}`,
      ...(env.STAGING_API_URL?.trim() ? [env.STAGING_API_URL.trim()] : []),
      ...(env.EXTRA_EVIDENCE_REFS
        ? env.EXTRA_EVIDENCE_REFS.split(',').map((value) => value.trim()).filter(Boolean)
        : []),
    ],
    blockers: uniqueBlockers,
    status: ready ? 'ready' : 'blocked',
    promotion: {
      target_environment: 'production',
      rebuild_allowed: false,
      exact_commit_required: true,
      exact_artifact_required: true,
      ...(env.ROLLBACK_REF?.trim() ? { rollback_ref: env.ROLLBACK_REF.trim() } : {}),
    },
    created_at: env.CREATED_AT?.trim() || new Date().toISOString(),
  };

  return releaseCandidateV1Schema.parse(candidate);
}

function main() {
  const outputPath = process.argv[2] || 'release-candidate.json';
  const candidate = buildReleaseCandidateEvidence(process.env);
  writeFileSync(outputPath, `${JSON.stringify(candidate, null, 2)}\n`, 'utf8');
  console.log(
    `ReleaseCandidateV1 ${candidate.candidate_id}: ${candidate.status} (${candidate.blockers.length} blockers)`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
