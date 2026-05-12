import type { IncomingMessage } from 'node:http';
import { randomUUID } from 'node:crypto';

export { randomUUID };

export const TENANT_SLUG_REGEX = /^[a-z0-9-]{3,64}$/;

export function assertTenantSlugOrThrow(tenantSlug: string): void {
  if (!TENANT_SLUG_REGEX.test(tenantSlug)) {
    throw new Error(`invalid tenant_slug: ${tenantSlug}`);
  }
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

export function hasExplicitAutonomyApproval(req: IncomingMessage): boolean {
  const raw = req.headers['x-autonomy-approved'];
  if (Array.isArray(raw)) {
    return raw.includes('true');
  }
  return raw === 'true';
}

export async function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}