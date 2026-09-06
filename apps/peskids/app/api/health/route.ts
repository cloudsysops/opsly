import peskidsPkg from '../../../package.json';
import { buildPeskidsProObservability } from '@/lib/observability/peskids-pro-health';
import { assertPeskidsDatabaseBoundary } from '@/lib/runtime-environment';

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
  try {
    assertPeskidsDatabaseBoundary();
  } catch {
    return Response.json(
      { status: 'error', code: 'ENVIRONMENT_BOUNDARY_INVALID', service: 'peskids' },
      { status: 503 }
    );
  }

  const gitSha = resolveGitSha();
  const imageTag = resolveImageTag();

  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: resolveVersion(),
    service: 'peskids',
    git_sha: gitSha,
    image_tag: imageTag,
    observability: buildPeskidsProObservability(),
  });
}
