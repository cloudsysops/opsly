import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { resolveAutonomyPolicy } from '../autonomy/policy.js';
import type { OrchestratorJob } from '../types.js';

export const TENANT_SLUG_REGEX = /^[a-z0-9-]{3,64}$/;

export async function parseBody(req: IncomingMessage, maxBytes = 1_048_576): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    let bytes = 0;
    let settled = false;
    req.on('data', (chunk: Buffer) => {
      if (settled) return;
      bytes += chunk.length;
      if (bytes > maxBytes) {
        settled = true;
        req.pause();
        reject(new Error('request body too large'));
        return;
      }
      data += chunk.toString();
    });
    req.on('end', () => {
      if (settled) return;
      try {
        settled = true;
        resolve(JSON.parse(data));
      } catch {
        settled = true;
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
  });
}

export function verifyPlatformAdminToken(req: IncomingMessage): boolean {
  const expected = process.env.PLATFORM_ADMIN_TOKEN?.trim() ?? '';
  if (expected.length === 0) {
    return false;
  }
  const auth = req.headers.authorization;
  const bearer =
    typeof auth === 'string' && auth.startsWith('Bearer ')
      ? auth.slice('Bearer '.length).trim()
      : '';
  return bearer.length > 0 && bearer === expected;
}

export function assertTenantSlugOrThrow(tenantSlug: string): void {
  if (!TENANT_SLUG_REGEX.test(tenantSlug)) {
    throw new Error(`invalid tenant_slug: ${tenantSlug}`);
  }
}

export function hasExplicitAutonomyApproval(req: IncomingMessage): boolean {
  const raw = req.headers['x-autonomy-approved'];
  if (Array.isArray(raw)) {
    return raw.includes('true');
  }
  return raw === 'true';
}

export { randomUUID };

export function enrichAutonomyMetadata(
  req: IncomingMessage,
  job: OrchestratorJob
): { ok: true } | { ok: false; status: number; payload: Record<string, unknown> } {
  const policy = resolveAutonomyPolicy(job.type, job.autonomy_risk);
  const metadata = {
    ...(job.metadata ?? {}),
    autonomy_risk: policy.riskLevel,
    autonomy_requires_approval: policy.requiresApproval,
    autonomy_auto_rollback: policy.allowAutoRollback,
  };

  if (policy.requiresApproval && !hasExplicitAutonomyApproval(req)) {
    return {
      ok: false,
      status: 403,
      payload: {
        error: 'autonomy_approval_required',
        autonomy_risk: policy.riskLevel,
      },
    };
  }

  job.autonomy_risk = policy.riskLevel;
  job.metadata = metadata;
  return { ok: true };
}
