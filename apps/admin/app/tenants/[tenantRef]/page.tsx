"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ContainerStatusGrid } from "@/components/tenants/ContainerStatusGrid";
import { PlanBadge } from "@/components/tenants/PlanBadge";
import { TenantActions } from "@/components/tenants/TenantActions";
import { TenantStatusBadge } from "@/components/tenants/TenantStatusBadge";
import { useTenant } from "@/hooks/useTenant";
import { parseServiceUrls, uptimeStatusPageUrl } from "@/lib/service-urls";
import { stackRecordToContainers } from "@/lib/stack-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";

function CopyUrlButton({ url }: { url: string }) {
  const [ok, setOk] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="font-mono text-xs"
      onClick={() => {
        void navigator.clipboard.writeText(url).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        });
      }}
    >
      {ok ? "copied" : "copy"}
    </Button>
  );
}

export default function TenantDetailPage() {
  const params = useParams();
  const tenantRef =
    typeof params.tenantRef === "string" ? params.tenantRef : "";
  const router = useRouter();
  const { data, error, isLoading, mutate } = useTenant(tenantRef);

  if (error) {
    return (
      <div className="rounded border border-ops-red/50 bg-ops-red/10 px-3 py-2 font-sans text-sm text-ops-red">
        {error.message}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const { tenant, stack_status } = data;
  const containers = stackRecordToContainers(stack_status);
  const urls = parseServiceUrls(tenant.services);
  const statusEmbed =
    urls.uptime !== null
      ? uptimeStatusPageUrl(urls.uptime, tenant.slug)
      : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-xl text-neutral-100">{tenant.name}</h1>
          <p className="mt-1 font-mono text-sm text-ops-green">{tenant.slug}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <TenantStatusBadge status={tenant.status} />
          </div>
        </div>
        <TenantActions
          tenantId={tenant.id}
          slug={tenant.slug}
          status={tenant.status}
          onMutate={() => void mutate()}
          onDeleted={() => router.push("/tenants")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-sans text-xs uppercase tracking-wide text-ops-gray">
              Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PlanBadge plan={tenant.plan} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-sans text-xs uppercase tracking-wide text-ops-gray">
              Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="break-all font-mono text-sm text-neutral-200">
              {tenant.owner_email}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-sans text-xs uppercase tracking-wide text-ops-gray">
              Creado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm text-neutral-200">
              {new Date(tenant.created_at).toLocaleString("es")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-sans text-sm text-ops-gray">
            Accesos directos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {urls.n8n ? (
            <Button variant="primary" size="sm" asChild>
              <a
                href={urls.n8n}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1"
              >
                Abrir n8n
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          ) : null}
          {urls.uptime ? (
            <Button variant="primary" size="sm" asChild>
              <a
                href={urls.uptime}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1"
              >
                Abrir Uptime Kuma
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          ) : null}
          {statusEmbed ? (
            <Button variant="ghost" size="sm" asChild>
              <a
                href={statusEmbed}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1"
              >
                Status page (nueva pestaña)
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {statusEmbed ? (
        <section className="space-y-2">
          <h2 className="font-sans text-xs uppercase tracking-wide text-ops-gray">
            Estado (embed)
          </h2>
          <p className="font-sans text-xs text-ops-gray">
            Si no carga, el servidor puede bloquear iframes (X-Frame-Options); usa
            el enlace de status page.
          </p>
          <div className="overflow-hidden rounded border border-ops-border bg-black/40">
            <iframe
              title={`Uptime status ${tenant.slug}`}
              src={statusEmbed}
              className="h-[min(520px,70vh)] w-full"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 font-sans text-xs uppercase tracking-wide text-ops-gray">
          Containers
        </h2>
        <ContainerStatusGrid containers={containers} />
      </section>

      <section>
        <h2 className="mb-3 font-sans text-xs uppercase tracking-wide text-ops-gray">
          URLs técnicas
        </h2>
        <div className="space-y-3 rounded border border-ops-border bg-ops-surface p-4">
          {urls.n8n ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-sans text-xs text-ops-gray">n8n</span>
              <a
                href={urls.n8n}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-mono text-xs text-ops-green hover:underline"
              >
                {urls.n8n}
                <ExternalLink className="h-3 w-3" />
              </a>
              <CopyUrlButton url={urls.n8n} />
            </div>
          ) : null}
          {urls.uptime ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-sans text-xs text-ops-gray">uptime</span>
              <a
                href={urls.uptime}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-mono text-xs text-ops-green hover:underline"
              >
                {urls.uptime}
                <ExternalLink className="h-3 w-3" />
              </a>
              <CopyUrlButton url={urls.uptime} />
            </div>
          ) : null}
          {!urls.n8n && !urls.uptime ? (
            <p className="font-sans text-sm text-ops-gray">Sin URLs en services.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
