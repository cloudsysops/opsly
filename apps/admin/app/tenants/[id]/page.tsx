"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ContainerStatusGrid } from "@/components/tenants/ContainerStatusGrid";
import { PlanBadge } from "@/components/tenants/PlanBadge";
import { TenantActions } from "@/components/tenants/TenantActions";
import { TenantStatusBadge } from "@/components/tenants/TenantStatusBadge";
import { useTenant } from "@/hooks/useTenant";
import { parseServiceUrls } from "@/lib/service-urls";
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
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { data, error, isLoading, mutate } = useTenant(id);

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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-xl text-neutral-100">{tenant.name}</h1>
          <p className="mt-1 font-mono text-sm text-ops-green">{tenant.slug}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <PlanBadge plan={tenant.plan} />
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

      <Card>
        <CardHeader>
          <CardTitle className="font-sans text-sm text-ops-gray">
            Información
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 font-sans text-sm sm:grid-cols-2">
          <div>
            <div className="text-ops-gray">owner_email</div>
            <div className="font-mono text-neutral-200">{tenant.owner_email}</div>
          </div>
          <div>
            <div className="text-ops-gray">stripe_customer_id</div>
            <div className="font-mono text-neutral-200">
              {tenant.stripe_customer_id ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-ops-gray">id</div>
            <div className="break-all font-mono text-xs text-neutral-400">
              {tenant.id}
            </div>
          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 font-sans text-xs uppercase tracking-wide text-ops-gray">
          Containers
        </h2>
        <ContainerStatusGrid containers={containers} />
      </section>

      <section>
        <h2 className="mb-3 font-sans text-xs uppercase tracking-wide text-ops-gray">
          URLs
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
