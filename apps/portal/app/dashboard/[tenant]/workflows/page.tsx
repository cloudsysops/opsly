import type { ReactElement } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Banknote, Bot, CheckCircle2, ExternalLink, PlugZap, ShieldCheck } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/premium-dashboard';
import { PortalShell } from '@/components/layout/portal-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getN8nWorkflowCatalog } from '@/lib/n8n-workflow-catalog';
import { requirePortalPayloadWithToken } from '@/lib/portal-server';
import { fetchPortalBillingSummary, fetchPortalN8nMarketplaceInstalls } from '@/lib/tenant';
import type { PortalBillingSummaryPayload } from '@/types';
import { MarketplacePackActions } from './marketplace-pack-actions';

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function WorkflowsMarketplacePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}): Promise<ReactElement> {
  const { tenant } = await params;
  const { payload, accessToken } = await requirePortalPayloadWithToken();
  if (tenant !== payload.slug) {
    redirect(`/dashboard/${payload.slug}/workflows`);
  }
  const catalog = getN8nWorkflowCatalog();
  const n8nUrl = payload.services.n8n_url;

  const activatedIds = new Set<string>();
  let billingSummary: PortalBillingSummaryPayload | null = null;
  let packMeteringThisMonth = 0;
  if (accessToken.length > 0) {
    const [billingResult, installsResult] = await Promise.allSettled([
      fetchPortalBillingSummary(accessToken),
      fetchPortalN8nMarketplaceInstalls(accessToken, tenant),
    ]);
    if (billingResult.status === 'fulfilled') {
      billingSummary = billingResult.value;
    }
    if (installsResult.status === 'fulfilled') {
      const body = installsResult.value;
      for (const row of body.installs) {
        activatedIds.add(row.catalog_item_id);
      }
      packMeteringThisMonth = body.billing_usage?.pack_metering_events_this_month ?? 0;
    }
  }

  return (
    <PortalShell title={`Marketplace - ${tenant}`} showModeLink tenantSlug={tenant}>
      <DashboardShell>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-ops-green">
              Workflow Marketplace
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-100">
              Automatizaciones plug-and-run para tu tenant
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
              Packs listos para instalar en n8n. El CRM Starter Pack ya queda aplicado por defecto
              en tenants activos y se importa inactivo para que puedas revisarlo antes de activar.
            </p>
            {accessToken.length > 0 ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Card variant="elevated">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-neutral-200">
                      <Banknote className="h-4 w-4 text-ops-green" aria-hidden />
                      Uso facturable (mes)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Datos desde la API (Postgres + Redis pendiente).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {billingSummary ? (
                      <>
                        <p className="text-neutral-300">
                          Total mes hasta hoy:{' '}
                          <span className="font-mono text-ops-green">
                            {formatUsd(billingSummary.current_total_usd)}
                          </span>
                        </p>
                        <p className="text-xs text-ops-gray">
                          Asentado {formatUsd(billingSummary.settled_cost_usd)} · Pendiente{' '}
                          {formatUsd(billingSummary.pending_cost_usd)}
                        </p>
                        <p className="text-xs text-ops-gray">
                          Proyección fin de mes:{' '}
                          <span className="font-mono text-neutral-200">
                            {formatUsd(billingSummary.projected_month_end_usd)}
                          </span>
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-amber-400/90">
                        No se pudo cargar el resumen de billing. Revisa sesión y API.
                      </p>
                    )}
                    <Button asChild variant="default" className="mt-2 w-full sm:w-auto">
                      <Link href={`/dashboard/${tenant}/subscriptions`}>Suscripciones y planes</Link>
                    </Button>
                  </CardContent>
                </Card>
                <Card variant="elevated">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-neutral-200">
                      Marketplace (medición)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Activaciones de pack registradas en metering este mes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="font-mono text-2xl text-ops-green">{packMeteringThisMonth}</p>
                    <p className="mt-1 text-xs text-ops-gray">
                      Instalaciones persistidas: {activatedIds.size}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <p className="mt-4 text-xs text-ops-gray">
                Inicia sesión con tu cuenta (no modo demo) para ver uso facturable y metering real.
              </p>
            )}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-ops-green" aria-hidden />
                Seguridad
              </CardTitle>
              <CardDescription>Sin secretos en templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-neutral-400">
              <p>Las credenciales se configuran por tenant en n8n/Doppler.</p>
              <p>Produccion autonoma requiere aprobacion humana.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {catalog.items.map((item) => (
            <Card key={item.id} variant="elevated">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <PlugZap className="h-4 w-4 text-ops-green" aria-hidden />
                      {item.name}
                    </CardTitle>
                    <CardDescription className="mt-2">{item.description}</CardDescription>
                  </div>
                  {item.installed_by_default ? (
                    <span className="rounded-sm border border-ops-green/40 bg-ops-green/10 px-2 py-1 text-xs text-ops-green">
                      default
                    </span>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-sm border border-ops-border bg-ops-bg/60 p-3">
                    <p className="text-xs text-ops-gray">Categoria</p>
                    <p className="mt-1 text-sm text-neutral-100">{item.category}</p>
                  </div>
                  <div className="rounded-sm border border-ops-border bg-ops-bg/60 p-3">
                    <p className="text-xs text-ops-gray">Plan minimo</p>
                    <p className="mt-1 text-sm text-neutral-100">{item.plan_min}</p>
                  </div>
                  <div className="rounded-sm border border-ops-border bg-ops-bg/60 p-3">
                    <p className="text-xs text-ops-gray">Workflows</p>
                    <p className="mt-1 text-sm text-neutral-100">{item.source_files.length}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-ops-gray">Incluye</p>
                  <ul className="space-y-2 text-sm text-neutral-300">
                    {item.webhooks.map((webhook) => (
                      <li key={webhook} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ops-green" />
                        <span>{webhook}</span>
                      </li>
                    ))}
                    <li className="flex gap-2">
                      <Bot className="mt-0.5 h-4 w-4 shrink-0 text-ops-green" />
                      <span>Follow-up diario y digest de pipeline</span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col gap-4">
                  <MarketplacePackActions
                    tenantSlug={tenant}
                    catalogItemId={item.id}
                    planMin={item.plan_min}
                    tenantPlan={payload.plan}
                    installedByDefault={item.installed_by_default}
                    accessToken={accessToken}
                    initiallyActivated={
                      item.installed_by_default || activatedIds.has(item.id)
                    }
                  />
                  <div className="flex flex-wrap gap-3">
                    {n8nUrl ? (
                      <Button asChild variant="primary">
                        <a href={n8nUrl} target="_blank" rel="noreferrer">
                          Abrir n8n
                          <ExternalLink className="h-4 w-4" aria-hidden />
                        </a>
                      </Button>
                    ) : null}
                    <Button asChild variant="default">
                      <Link href="/landing">Solicitar nuevo pack</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DashboardShell>
    </PortalShell>
  );
}
