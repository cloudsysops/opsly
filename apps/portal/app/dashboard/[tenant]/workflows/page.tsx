import type { ReactElement } from 'react';
import Link from 'next/link';
import { Bot, CheckCircle2, ExternalLink, PlugZap, ShieldCheck } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/premium-dashboard';
import { PortalShell } from '@/components/layout/portal-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getN8nWorkflowCatalog } from '@/lib/n8n-workflow-catalog';
import { requirePortalPayload } from '@/lib/portal-server';

export default async function WorkflowsMarketplacePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}): Promise<ReactElement> {
  const { tenant } = await params;
  const payload = await requirePortalPayload();
  const catalog = getN8nWorkflowCatalog();
  const n8nUrl = payload.services.n8n_url;

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
              </CardContent>
            </Card>
          ))}
        </div>
      </DashboardShell>
    </PortalShell>
  );
}
