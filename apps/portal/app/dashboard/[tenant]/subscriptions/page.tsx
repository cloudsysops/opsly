import type { ReactElement } from 'react';
import { createServerSupabase } from '@/lib/supabase/server';
import { getApiBaseUrl } from '@/lib/api';
import { PortalShell } from '@/components/layout/portal-shell';
import { DashboardShell } from '@/components/dashboard/premium-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubscriptionCard } from './subscription-card';
import { PlanSelector } from './plan-selector';
import {
  demoBillingPlans,
  demoSubscription,
  PORTAL_DEMO_TENANT_SLUG,
} from '@/lib/demo-tenant';
import { isPortalDemoSession } from '@/lib/demo-session';

interface BillingPlan {
  id: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  yearly_price_cents: number;
  currency: string;
  features: Record<string, unknown>;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  billing_period: string;
  amount_cents: number;
  currency: string;
  current_period_start: string | null;
  current_period_end: string | null;
  auto_renew: boolean;
  created_at: string;
  cancelled_at: string | null;
}

interface SubscriptionResponse {
  subscription: Subscription | null;
  plans: BillingPlan[];
}

async function fetchSubscription(token: string, tenantId: string): Promise<SubscriptionResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/billing/subscriptions?tenant_id=${tenantId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    return { subscription: null, plans: [] };
  }

  return (await res.json()) as SubscriptionResponse;
}

async function resolveTenantId(token: string, slug: string): Promise<string | null> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/tenants?status=active&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { data: { id: string; slug: string }[] };
  const tenant = body.data.find((t) => t.slug === slug);
  return tenant?.id ?? null;
}

export default async function SubscriptionsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}): Promise<ReactElement> {
  const { tenant } = await params;
  if (await isPortalDemoSession()) {
    const plans = demoBillingPlans();
    return (
      <PortalShell title={`Suscripcion - ${tenant}`} showModeLink tenantSlug={tenant}>
        <DashboardShell>
          <h1 className="font-sans text-xl font-semibold text-neutral-100">Suscripcion</h1>
          <SubscriptionCard subscription={demoSubscription()} plans={plans} tenant={tenant} />
        </DashboardShell>
      </PortalShell>
    );
  }
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token ?? '';
  const tenantId = await resolveTenantId(token, tenant);

  const { subscription, plans } = tenantId
    ? await fetchSubscription(token, tenantId)
    : { subscription: null, plans: [] };

  return (
    <PortalShell title={`Suscripcion - ${tenant}`} showModeLink tenantSlug={tenant}>
      <DashboardShell>
        <h1 className="font-sans text-xl font-semibold text-neutral-100">Suscripcion</h1>

        {subscription ? (
          <SubscriptionCard subscription={subscription} plans={plans} tenant={tenant} />
        ) : (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Sin suscripcion activa</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-sm text-ops-gray">Selecciona un plan para comenzar.</p>
              <PlanSelector
                plans={plans}
                tenant={tenant}
                tenantId={tenantId ?? PORTAL_DEMO_TENANT_SLUG}
              />
            </CardContent>
          </Card>
        )}
      </DashboardShell>
    </PortalShell>
  );
}
