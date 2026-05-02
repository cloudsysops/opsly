import { cookies, headers } from 'next/headers';
import {
  normalizePortalDemoMode,
  PORTAL_DEMO_COOKIE,
  PORTAL_DEMO_MODE_COOKIE,
  PORTAL_DEMO_TENANT_SLUG,
} from '@/lib/demo-tenant';
import type { PortalMode } from '@/types';

export async function isPortalDemoSession(): Promise<boolean> {
  const cookieStore = await cookies();
  if (cookieStore.get(PORTAL_DEMO_COOKIE)?.value !== '1') {
    return false;
  }
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  return host.startsWith('localhost') || host.startsWith('127.0.0.1');
}

export async function getPortalDemoMode(): Promise<PortalMode> {
  const cookieStore = await cookies();
  return normalizePortalDemoMode(cookieStore.get(PORTAL_DEMO_MODE_COOKIE)?.value);
}

export function portalDemoTenantMatches(slug: string): boolean {
  return slug === PORTAL_DEMO_TENANT_SLUG;
}
