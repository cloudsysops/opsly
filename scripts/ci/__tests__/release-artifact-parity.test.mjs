import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditDockerfileText,
  buildReleaseArtifactParityAudit,
} from '../check-release-artifact-parity.mjs';

test('builder audit ignores runtime-only environment and flags environment-coupled build args', () => {
  const report = auditDockerfileText(
    'demo',
    'Dockerfile',
    `FROM node:20 AS builder
ARG NEXT_PUBLIC_API_URL
ARG BUILD_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build
FROM node:20 AS runner
ENV NEXT_PUBLIC_RUNTIME_ONLY=value
`,
  );
  assert.equal(report.same_digest_ready, false);
  assert.deepEqual(report.environment_coupled_build_args, ['NEXT_PUBLIC_API_URL']);
});

test('builder audit is ready when build stage has no environment-specific public args', () => {
  const report = auditDockerfileText(
    'demo',
    'Dockerfile',
    `FROM node:20 AS builder
ARG BUILD_ID
RUN npm run build
FROM node:20 AS runner
ENV PLATFORM_DOMAIN=runtime.example
`,
  );
  assert.equal(report.same_digest_ready, true);
  assert.deepEqual(report.blockers, []);
});

test('current platform images expose the exact same-digest blockers instead of claiming parity', () => {
  const audit = buildReleaseArtifactParityAudit();
  assert.equal(audit.schema_version, 'ReleaseArtifactParityAuditV1');
  assert.equal(audit.same_digest_ready, false);

  const byService = Object.fromEntries(audit.services.map((service) => [service.service, service]));
  assert.deepEqual(byService.api.environment_coupled_build_args, [
    'NEXT_PUBLIC_ADMIN_URL',
    'PLATFORM_DOMAIN',
  ]);
  assert.deepEqual(byService.admin.environment_coupled_build_args, [
    'NEXT_PUBLIC_ADMIN_PUBLIC_DEMO',
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
  ]);
  assert.deepEqual(byService.portal.environment_coupled_build_args, [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_PLATFORM_DOMAIN',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPPORT_EMAIL',
  ]);

  assert.ok(audit.blockers.includes('build_time_environment_coupling:api:PLATFORM_DOMAIN'));
  assert.ok(audit.blockers.includes('build_time_environment_coupling:admin:NEXT_PUBLIC_SUPABASE_URL'));
  assert.ok(audit.blockers.includes('build_time_environment_coupling:portal:NEXT_PUBLIC_PLATFORM_DOMAIN'));
});
