#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const RELEASE_SERVICE_IMAGES = Object.freeze({
  app: 'api',
  admin: 'admin',
  portal: 'portal',
  icso: 'icso',
  mcp: 'mcp',
  'llm-gateway': 'llm-gateway',
  orchestrator: 'orchestrator',
  hermes: 'hermes',
  'context-builder': 'context-builder',
});

function requireSha(value, label) {
  const normalized = String(value ?? '').trim();
  if (!/^[0-9a-f]{40}$/.test(normalized)) {
    throw new Error(`${label} must be a full 40-character lowercase commit SHA`);
  }
  return normalized;
}

function requireDigest(value, label) {
  const normalized = String(value ?? '').trim();
  if (!/^sha256:[0-9a-f]{64}$/.test(normalized)) {
    throw new Error(`${label} must be a sha256 digest`);
  }
  return normalized;
}

function parseDigestMap(raw) {
  let value;
  try {
    value = JSON.parse(String(raw ?? ''));
  } catch (error) {
    throw new Error(`previous release digest map must be valid JSON: ${error.message}`);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('previous release digest map must be an object keyed by image service');
  }
  return value;
}

export function buildReleaseRollbackPlan({ attemptedSha, previousSha, previousDigests }) {
  const attempted = requireSha(attemptedSha, 'attempted release SHA');
  const previous = requireSha(previousSha, 'previous release SHA');
  if (attempted === previous) {
    throw new Error('rollback target must differ from attempted release SHA');
  }

  const digestMap =
    typeof previousDigests === 'string' ? parseDigestMap(previousDigests) : previousDigests;
  if (!digestMap || typeof digestMap !== 'object' || Array.isArray(digestMap)) {
    throw new Error('previous release digest map must be an object keyed by image service');
  }

  const services = Object.entries(RELEASE_SERVICE_IMAGES).map(([composeService, imageService]) => {
    const digest = requireDigest(
      digestMap[imageService],
      `previous digest for ${imageService}`,
    );
    return {
      compose_service: composeService,
      image_service: imageService,
      digest,
      immutable_ref: `ghcr.io/cloudsysops/intcloudsysops-${imageService}@${digest}`,
    };
  });

  return {
    schema_version: 'ReleaseRollbackPlanV1',
    attempted_release_sha: attempted,
    rollback_release_sha: previous,
    exact_checkout_required: true,
    exact_artifacts_required: true,
    rebuild_allowed: false,
    services,
    preconditions: [
      'production_smoke_failed',
      'previous_release_evidence_complete',
      'rollback_target_digests_resolved',
    ],
    execution_authority: 'production-release-workflow-only',
    executable_from_this_script: false,
  };
}

function main() {
  const sourcePath = process.argv[2];
  const payload = sourcePath
    ? JSON.parse(readFileSync(sourcePath, 'utf8'))
    : {
        attemptedSha: process.env.ATTEMPTED_RELEASE_SHA,
        previousSha: process.env.PREVIOUS_RELEASE_SHA,
        previousDigests: process.env.PREVIOUS_RELEASE_DIGESTS_JSON,
      };
  const plan = buildReleaseRollbackPlan(payload);
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(`release-rollback-plan: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
