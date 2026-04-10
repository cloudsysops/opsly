"use client";

import { createClient } from "@/lib/supabase";
import { postPortalOnboarding } from "@/lib/tenant";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function deriveSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

const SLUG_RE = /^[a-z0-9-]{3,30}$/;

type Plan = "startup" | "business" | "enterprise";

const PLANS = [
  {
    id: "startup" as Plan,
    name: "Startup",
    price: "Gratis",
    features: ["1 agente n8n", "Monitoreo básico", "3 workflows"],
    accent: "text-emerald-400",
    border: "border-emerald-500/40",
  },
  {
    id: "business" as Plan,
    name: "Business",
    price: "$49/mes",
    features: ["5 agentes n8n", "Uptime Kuma", "Workflows ilimitados"],
    accent: "text-cyan-400",
    border: "border-cyan-500/40",
  },
  {
    id: "enterprise" as Plan,
    name: "Enterprise",
    price: "Custom",
    features: ["Agentes ilimitados", "SLA 99.9%", "Soporte dedicado"],
    accent: "text-violet-400",
    border: "border-violet-500/40",
  },
];

function StepBar({ current }: { current: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      {([1, 2] as const).map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className={[
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-mono font-bold transition-all",
              n === current
                ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                : n < current
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "bg-slate-800 text-slate-500 border border-slate-700",
            ].join(" ")}
          >
            {n < current ? "✓" : n}
          </div>
          <span
            className={[
              "text-xs font-mono",
              n === current ? "text-slate-200" : "text-slate-500",
            ].join(" ")}
          >
            {n === 1 ? "Tu organización" : "Tu Agente"}
          </span>
          {n < 2 && <div className="w-8 h-px bg-slate-700" />}
        </div>
      ))}
    </div>
  );
}

export default function OnboardingStep1() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [plan, setPlan] = useState<Plan>("startup");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const slugRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!slugEdited) {
      setSlug(deriveSlug(orgName));
    }
  }, [orgName, slugEdited]);

  const slugValid = SLUG_RE.test(slug);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);

    if (!orgName.trim()) {
      setErr("El nombre de la organización es obligatorio");
      return;
    }
    if (!slugValid) {
      setErr("El identificador debe tener 3-30 caracteres: letras minúsculas, números y guiones");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const result = await postPortalOnboarding(session.access_token, {
        org_name: orgName.trim(),
        slug,
        plan,
      });

      await supabase.auth.refreshSession();

      const params = new URLSearchParams({
        slug: result.slug,
        org: result.org_name,
        plan: result.plan,
      });
      router.push("/onboarding/step-2?" + params.toString());
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Error al crear la organización");
    } finally {
      setLoading(false);
    }
  }

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
              Infrastructure Control
            </p>
          </div>

          <StepBar current={1} />

          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-8 shadow-xl shadow-black/50 backdrop-blur-xl">
            <h1 className="mb-1 text-xl font-semibold text-slate-100">
              Crea tu organización
            </h1>
            <p className="mb-6 text-sm text-slate-400">
              Tu espacio de automatización en Opsly. Solo tarda 30 segundos.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="org-name" className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                  Nombre de la organización
                </label>
                <input
                  id="org-name"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Corp"
                  autoComplete="organization"
                  autoFocus
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="org-slug" className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                  Identificador único
                </label>
                <div className="relative">
                  <input
                    id="org-slug"
                    ref={slugRef}
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlugEdited(true);
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                    }}
                    placeholder="acme-corp"
                    className={[
                      "w-full rounded-lg border bg-slate-800/60 px-4 py-2.5 font-mono text-sm placeholder-slate-500 outline-none transition-all",
                      slug.length === 0
                        ? "border-slate-700 text-slate-100"
                        : slugValid
                        ? "border-emerald-500/50 text-emerald-300 focus:ring-1 focus:ring-emerald-500/30"
                        : "border-rose-500/50 text-rose-300 focus:ring-1 focus:ring-rose-500/30",
                    ].join(" ")}
                  />
                  {slug.length > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                      {slugValid ? "✓" : "✗"}
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-slate-500">
                  Solo letras minúsculas, números y guiones · 3-30 caracteres
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                  Plan
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {PLANS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlan(p.id)}
                      className={[
                        "relative flex flex-col items-start rounded-xl border p-3 text-left transition-all duration-200 hover:brightness-110",
                        plan === p.id
                          ? p.border + " bg-slate-800/80 shadow-md"
                          : "border-slate-700/50 bg-slate-800/30",
                      ].join(" ")}
                    >
                      {plan === p.id && (
                        <span className="absolute right-2 top-2 text-[9px] font-mono text-emerald-400">
                          ✓
                        </span>
                      )}
                      <span className={"text-xs font-semibold " + p.accent}>{p.name}</span>
                      <span className="mt-0.5 text-[10px] font-mono text-slate-300">{p.price}</span>
                      <ul className="mt-1.5 space-y-0.5">
                        {p.features.map((f) => (
                          <li key={f} className="text-[10px] text-slate-400 leading-tight">
                            {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
              </div>

              {err && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !slugValid || orgName.trim().length < 2}
                className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:from-cyan-400 hover:to-indigo-400 hover:shadow-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creando organización...
                  </span>
                ) : (
                  "Continuar →"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
