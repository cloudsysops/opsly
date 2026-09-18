import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { requireAdminAccess } from '../../../../../lib/auth';
import { detectCanonicalDispatchAdmission } from '../../../../../lib/mission-control-execution-source-admission';

function resolveRepoRoot(): string {
  const cwd = process.cwd();
  const repoRoot = process.env.OPSLY_REPO_ROOT?.trim();
  const candidates = [...(repoRoot ? [repoRoot] : []), cwd, join(cwd, '..'), join(cwd, '..', '..')];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'config', 'external-agent-registry.json'))) {
      return candidate;
    }
  }
  return cwd;
}

export async function GET(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) return authError;

  const root = resolveRepoRoot();
  const registryPath = join(root, 'config', 'external-agent-registry.json');
  const queueSubmitterPath = join(root, 'scripts', 'ops', 'github-agent-queue-submit.mjs');
  const handoffPath = join(root, 'scripts', 'ops', 'interactive-agent-handoff.mjs');

  try {
    const [registryRaw, queueSubmitter] = await Promise.all([
      readFile(registryPath, 'utf8'),
      readFile(queueSubmitterPath, 'utf8').catch(() => ''),
    ]);
    const registry = JSON.parse(registryRaw) as {
      workers?: Record<string, { enabled?: boolean; opsly_job_type?: string }>;
    };

    const registeredWorkers = Object.entries(registry.workers ?? {})
      .map(([id, entry]) => ({
        id,
        enabled: entry.enabled === true,
        opsly_job_type: typeof entry.opsly_job_type === 'string' ? entry.opsly_job_type : null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    const registryDrivenAdmission = detectCanonicalDispatchAdmission(queueSubmitter);

    return NextResponse.json({
      schema_version: 'MissionControlExecutionSourcesV1',
      observed_at: new Date().toISOString(),
      registry_driven_admission: registryDrivenAdmission,
      handoff_available: existsSync(handoffPath),
      registered_workers: registeredWorkers,
    });
  } catch (error) {
    console.error('[mission-control/execution-sources] Error:', error);
    return NextResponse.json({
      schema_version: 'MissionControlExecutionSourcesV1',
      observed_at: new Date().toISOString(),
      registry_driven_admission: false,
      handoff_available: false,
      registered_workers: [],
      error: 'execution source probe unavailable',
    });
  }
}
