import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import {
  fetchPortalInsights,
  fetchPortalTenant,
  fetchPortalUsage,
  tenantSlugFromUserMetadata,
} from '@/lib/tenant';
import type { PortalInsightsPayload, PortalTenantPayload, PortalUsageSnapshot } from '@/types';
import {
  demoPortalInsights,
  demoPortalTenantPayload,
  demoPortalUsageSnapshot,
} from '@/lib/demo-tenant';
import { getPortalDemoMode, isPortalDemoSession } from '@/lib/demo-session';

const PORTAL_AUTH_TIMEOUT_MS = 2_000;

async function withPortalTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`${label} timeout after ${PORTAL_AUTH_TIMEOUT_MS / 1000}s`)),
          PORTAL_AUTH_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

export async function requirePortalPayload(): Promise<PortalTenantPayload> {
  if (await isPortalDemoSession()) {
    return demoPortalTenantPayload(await getPortalDemoMode());
  }
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await withPortalTimeout(supabase.auth.getSession(), 'portal session');
  if (!session?.access_token) {
    redirect('/login');
  }
  try {
    const {
      data: { user },
    } = await withPortalTimeout(supabase.auth.getUser(), 'portal user');
    const slug = tenantSlugFromUserMetadata(user);
    return await fetchPortalTenant(session.access_token, slug);
  } catch {
    redirect('/login');
  }
}

/** Igual que `requirePortalPayload` pero expone el Bearer para llamadas API desde el cliente. */
export async function requirePortalPayloadWithToken(): Promise<{
  payload: PortalTenantPayload;
  accessToken: string;
}> {
  if (await isPortalDemoSession()) {
    return {
      payload: demoPortalTenantPayload(await getPortalDemoMode()),
      accessToken: '',
    };
  }
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await withPortalTimeout(supabase.auth.getSession(), 'portal session');
  if (!session?.access_token) {
    redirect('/login');
  }
  try {
    const {
      data: { user },
    } = await withPortalTimeout(supabase.auth.getUser(), 'portal user');
    const slug = tenantSlugFromUserMetadata(user);
    const payload = await fetchPortalTenant(session.access_token, slug);
    return { payload, accessToken: session.access_token };
  } catch {
    redirect('/login');
  }
}

/**
 * Sesión portal + métricas LLM vía `GET /api/portal/tenant/[slug]/usage` (slug del payload).
 * Si la API de uso falla, devuelve `null` por periodo sin invalidar el dashboard.
 */
export async function requirePortalPayloadWithUsage(): Promise<{
  payload: PortalTenantPayload;
  usage: PortalUsageSnapshot;
}> {
  if (await isPortalDemoSession()) {
    return {
      payload: demoPortalTenantPayload(await getPortalDemoMode()),
      usage: demoPortalUsageSnapshot(),
    };
  }
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await withPortalTimeout(supabase.auth.getSession(), 'portal session');
  if (!session?.access_token) {
    redirect('/login');
  }
  const token = session.access_token;
  try {
    const {
      data: { user },
    } = await withPortalTimeout(supabase.auth.getUser(), 'portal user');
    const slugFromJwt = tenantSlugFromUserMetadata(user);
    const payload = await fetchPortalTenant(token, slugFromJwt);
    const slug = payload.slug;
    const [today, month] = await Promise.all([
      fetchPortalUsage(token, 'today', slug).catch((): null => null),
      fetchPortalUsage(token, 'month', slug).catch((): null => null),
    ]);
    return { payload, usage: { today, month } };
  } catch {
    redirect('/login');
  }
}

/**
 * Igual que `requirePortalPayloadWithUsage` más insights predictivos (fallo → `null`).
 */
export async function requirePortalPayloadWithUsageAndInsights(): Promise<{
  payload: PortalTenantPayload;
  usage: PortalUsageSnapshot;
  insights: PortalInsightsPayload | null;
}> {
  if (await isPortalDemoSession()) {
    return {
      payload: demoPortalTenantPayload(await getPortalDemoMode()),
      usage: demoPortalUsageSnapshot(),
      insights: demoPortalInsights(),
    };
  }
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await withPortalTimeout(supabase.auth.getSession(), 'portal session');
  if (!session?.access_token) {
    redirect('/login');
  }
  const token = session.access_token;
  try {
    const {
      data: { user },
    } = await withPortalTimeout(supabase.auth.getUser(), 'portal user');
    const slugFromJwt = tenantSlugFromUserMetadata(user);
    const payload = await fetchPortalTenant(token, slugFromJwt);
    const slug = payload.slug;
    const [today, month, insights] = await Promise.all([
      fetchPortalUsage(token, 'today', slug).catch((): null => null),
      fetchPortalUsage(token, 'month', slug).catch((): null => null),
      fetchPortalInsights(token, slug).catch((): null => null),
    ]);
    return {
      payload,
      usage: { today, month },
      insights,
    };
  } catch {
    redirect('/login');
  }
}
