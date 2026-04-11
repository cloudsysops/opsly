"use client";

import { fetchProvisioningQuote } from "@/lib/provisioning-quote";
import type { ProvisioningQuoteResponse } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";

function formatUsd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function infraLabelForProvider(provider: "aws" | "azure" | "gcp"): string {
  if (provider === "aws") {
    return "Costo de Infraestructura (AWS)";
  }
  if (provider === "azure") {
    return "Costo de Infraestructura (Azure)";
  }
  return "Costo de Infraestructura (GCP)";
}

function formatInfraDisplay(quote: ProvisioningQuoteResponse): string {
  if (quote.is_free_tier) {
    return `${formatUsd(quote.cloud_cost_estimated_usd)} (Free Tier)`;
  }
  return formatUsd(quote.cloud_cost_estimated_usd);
}

export default function AuthorizeDeploymentPage() {
  return (
    <Suspense fallback={null}>
      <AuthorizeDeploymentContent />
    </Suspense>
  );
}

function AuthorizeDeploymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const providerParam = searchParams.get("provider");
  const planParam = searchParams.get("plan");

  const provider =
    providerParam === "azure" || providerParam === "gcp" ? providerParam : "aws";
  const plan =
    planParam === "serverless-starter" ? "serverless-starter" : "free-tier";

  const [quote, setQuote] = useState<ProvisioningQuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [deploying, setDeploying] = useState(false);

  const loadQuote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = await fetchProvisioningQuote({ provider, plan });
      setQuote(q);
    } catch (e) {
      setQuote(null);
      setError(e instanceof Error ? e.message : "No se pudo cargar la cotización");
    } finally {
      setLoading(false);
    }
  }, [provider, plan]);

  useEffect(() => {
    void loadQuote();
  }, [loadQuote]);

  async function handleDeploy() {
    if (!accepted || !quote) {
      return;
    }
    setDeploying(true);
    try {
      // MVP: siguiente iteración llamará a POST de aprovisionamiento con credenciales del cliente.
      await new Promise((r) => setTimeout(r, 400));
      router.push("/dashboard");
    } finally {
      setDeploying(false);
    }
  }

  const infraLabel = infraLabelForProvider(provider);
  const infraDisplay = quote === null ? "—" : formatInfraDisplay(quote);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <div
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, #334155 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <span className="font-mono text-lg font-bold tracking-widest text-cyan-400">
              OPSLY
            </span>
            <p className="mt-1 text-xs font-mono text-slate-500 tracking-widest uppercase">
              Autorización de despliegue
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-8 shadow-xl shadow-black/50 backdrop-blur-xl">
            <h1 className="mb-1 text-xl font-semibold text-slate-100">Cotización</h1>
            <p className="mb-6 text-sm text-slate-400">
              Revisa los costos estimados antes de autorizar el despliegue en tu cuenta de nube.
            </p>

            {loading && (
              <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
                <span>Cargando cotización…</span>
              </div>
            )}

            {!loading && error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            )}

            {!loading && quote && (
              <>
                <dl className="space-y-4 rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 font-mono text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-400">{infraLabel}</dt>
                    <dd className="text-right text-emerald-300">{infraDisplay}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-400">Fee de Gestión Opsly</dt>
                    <dd className="text-right text-cyan-300">
                      {formatUsd(quote.opsly_fee_usd)}
                    </dd>
                  </div>
                  <div className="border-t border-slate-700 pt-3 flex justify-between gap-4 font-semibold">
                    <dt className="text-slate-200">Total estimado / mes</dt>
                    <dd className="text-right text-slate-100">
                      {formatUsd(quote.total_monthly_usd)}
                    </dd>
                  </div>
                </dl>

                {quote.line_items.length > 0 && (
                  <ul className="mt-4 space-y-1 text-xs text-slate-500">
                    {quote.line_items.map((row) => (
                      <li key={row.label} className="flex justify-between gap-2">
                        <span>{row.label}</span>
                        <span>{formatUsd(row.amountUsd)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <p className="mt-6 text-xs leading-relaxed text-slate-500">{quote.terms}</p>

                <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700/80 bg-slate-800/30 p-3 transition-colors hover:border-slate-600">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/40"
                  />
                  <span className="text-sm text-slate-300">
                    Entiendo que Opsly aplicará cargos de gestión. Autorizo el despliegue en mi
                    cuenta de nube.
                  </span>
                </label>

                <button
                  type="button"
                  disabled={!accepted || deploying}
                  onClick={() => void handleDeploy()}
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:from-cyan-400 hover:to-indigo-400 hover:shadow-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deploying ? "Procesando…" : "Desplegar Infraestructura"}
                </button>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-600">
            Plan: <span className="font-mono text-slate-500">{plan}</span> · Proveedor:{" "}
            <span className="font-mono text-slate-500">{provider}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
