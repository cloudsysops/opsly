import peskidsPkg from '../../../package.json';
import { buildPeskidsProObservability } from '@/lib/observability/peskids-pro-health';
import { checkEnvironmentBoundary } from '@/lib/runtime-environment';

function resolveVersion(): string {
  return typeof peskidsPkg.version === 'string' ? peskidsPkg.version : '0.0.0';
}

function resolveGitSha(): string | null {
  const raw =
    process.env.PESKIDS_GIT_SHA?.trim() ||
    process.env.GIT_SHA?.trim() ||
    process.env.NEXT_PUBLIC_PESKIDS_GIT_SHA?.trim() ||
    '';
  return raw.length > 0 ? raw : null;
}

function resolveImageTag(): string | null {
  const raw =
    process.env.PESKIDS_IMAGE_TAG?.trim() ||
    process.env.PESKIDS_IMAGE?.trim() ||
    process.env.NEXT_PUBLIC_PESKIDS_IMAGE_TAG?.trim() ||
    '';
  return raw.length > 0 ? raw : null;
}

export async function GET(): Promise<Response> {
  const boundary = checkEnvironmentBoundary();

  // Only the environment name and the violation codes are exposed — never the
  // Supabase URL, project ref, or any message that could carry a secret.
  if (!boundary.ok) {
    return Response.json(
      {
        status: 'error',
        code: 'ENVIRONMENT_BOUNDARY_INVALID',
        service: 'peskids',
        environment: boundary.environment,
        environment_boundary: { ok: false, violations: boundary.violations.map((violation) => violation.code) },
      },
      { status: 503 }
    );
  }

  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: resolveVersion(),
    service: 'peskids',
    environment: boundary.environment,
    environment_boundary: { ok: true },
    git_sha: resolveGitSha(),
    image_tag: resolveImageTag(),
    observability: buildPeskidsProObservability(),
  });
}
