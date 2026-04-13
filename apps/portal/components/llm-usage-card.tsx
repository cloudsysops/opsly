import type { ReactElement } from "react";
import type { PortalUsagePayload, PortalUsageSnapshot } from "@/types";

function formatUsd(n: number): string {
  return new Intl.NumberFormat("es", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(n);
}

function formatInt(n: number): string {
  return new Intl.NumberFormat("es").format(n);
}

function UsageBlock(props: {
  title: string;
  data: PortalUsagePayload | null;
}): ReactElement {
  const { title, data } = props;
  if (data === null) {
    return (
      <div className="rounded-md border border-ops-border/60 bg-ops-surface/50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ops-gray">{title}</p>
        <p className="mt-2 text-sm text-ops-gray">No disponible</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-ops-border/60 bg-ops-surface/50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ops-gray">{title}</p>
      <dl className="mt-2 space-y-1 text-sm text-neutral-300">
        <div className="flex justify-between gap-2">
          <dt className="text-ops-gray">Peticiones</dt>
          <dd className="font-mono tabular-nums">{formatInt(data.requests)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ops-gray">Tokens (entrada / salida)</dt>
          <dd className="text-right font-mono text-xs tabular-nums">
            {formatInt(data.tokens_input)} / {formatInt(data.tokens_output)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ops-gray">Coste estimado</dt>
          <dd className="font-mono tabular-nums">{formatUsd(data.cost_usd)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ops-gray">Caché LLM</dt>
          <dd className="font-mono tabular-nums">{formatInt(data.cache_hit_rate)}%</dd>
        </div>
      </dl>
    </div>
  );
}

export function LlmUsageCard(props: { usage: PortalUsageSnapshot }): ReactElement {
  const { usage } = props;
  const empty = usage.today === null && usage.month === null;

  return (
    <section className="space-y-3 rounded-lg border border-ops-border bg-ops-surface p-5">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ops-gray">Uso de IA (LLM)</h2>
        <p className="mt-1 text-xs text-ops-gray">
          Agregado de tu tenant vía API; períodos calendario (hoy / mes en curso).
        </p>
      </div>
      {empty ? (
        <p className="text-sm text-ops-gray">
          No pudimos cargar las métricas en este momento. El resto del panel sigue disponible.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <UsageBlock title="Hoy" data={usage.today} />
          <UsageBlock title="Este mes" data={usage.month} />
        </div>
      )}

      {!empty && usage.month !== null ? (
        <div className="mt-4 border-t border-ops-border/40 pt-4">
          <p className="text-xs text-ops-gray">
            El coste mensual se factura según uso real. Los datos son aproximados.
          </p>
        </div>
      ) : null}
    </section>
  );
}
