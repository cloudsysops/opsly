import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import {
  fetchPortalInsights,
  fetchPortalTenant,
  fetchPortalUsage,
  fetchShieldScore,
  tenantSlugFromUserMetadata,
} from '@/lib/tenant';
import type {
  PortalInsightsPayload,
  PortalTenantPayload,
  PortalUsageSnapshot,
  ShieldScorePayload,
} from '@/types';

export async function requirePortalPayload(): Promise<PortalTenantPayload> {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    redirect('/login');
  }
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const slug = tenantSlugFromUserMetadata(user);
    return await fetchPortalTenant(session.access_token, slug);
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
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    redirect('/login');
  }
  const token = session.access_token;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    redirect('/login');
  }
  const token = session.access_token;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
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

/** Shield dashboard: tenant + score (secrets section loads client-side). */
export async function requirePortalPayloadWithShield(): Promise<{
  payload: PortalTenantPayload;
  shieldScore: ShieldScorePayload | null;
}> {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    redirect('/login');
  }
  const token = session.access_token;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const slugFromJwt = tenantSlugFromUserMetadata(user);
    const payload = await fetchPortalTenant(token, slugFromJwt);
    const slug = payload.slug;
    const shieldScore = await fetchShieldScore(token, slug).catch((): null => null);
    return { payload, shieldScore };
  } catch {
    redirect('/login');
  }
}
