"use client";

import { useState } from "react";

/* ─── Plan definitions ──────────────────────────────────────────────────── */

type Plan = "startup" | "business" | "enterprise";

interface PlanDef {
  key: Plan;
  name: string;
  price: number | null;
  priceLabel: string;
  description: string;
  features: string[];
  badge: string | null;
  highlighted: boolean;
}

const PLANS: PlanDef[] = [
  {
    key: "startup",
    name: "Startup",
    price: 49,
    priceLabel: "$49 / mes",
    description: "Ideal para equipos que arrancan su automatización.",
    features: [
      "n8n + Uptime Kuma incluidos",
      "Hasta 10 workflows activos",
      "LLM Gateway (GPT-4o mini)",
      "Backups diarios automáticos",
      "Email support (48h)",
    ],
    badge: null,
    highlighted: false,
  },
  {
    key: "business",
    name: "Business",
    price: 149,
    priceLabel: "$149 / mes",
    description: "Para empresas que necesitan IA avanzada y más escala.",
    features: [
      "Todo lo de Startup",
      "Hasta 50 workflows activos",
      "OpenClaw IA (GPT-4o + agentes)",
      "Portal cliente personalizado",
      "Soporte prioritario (12h)",
      "Uptime SLA 99.5%",
    ],
    badge: "Más popular",
    highlighted: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: 499,
    priceLabel: "$499 / mes",
    description: "Solución completa con seguridad y SLA garantizado.",
    features: [
      "Todo lo de Business",
      "Workflows ilimitados",
      "SSO + SAML empresarial",
      "Dominio propio (white-label)",
      "Slack dedicado (4h SLA)",
      "Uptime SLA 99.9% + crédito",
    ],
    badge: null,
    highlighted: false,
  },
];

/* ─── Checkout modal ────────────────────────────────────────────────────── */

interface CheckoutModalProps {
  plan: PlanDef;
  apiUrl: string;
  onClose: () => void;
}

interface CheckoutErrors {
  email?: string[];
  slug?: string[];
  general?: string;
}

function CheckoutModal({ plan, apiUrl, onClose }: CheckoutModalProps) {
  const [email, setEmail] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<CheckoutErrors>({});

  const sanitizeSlug = (v: string) =>
    v.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/api/checkout/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, slug, plan: plan.key }),
      });

      const data = await res.json() as { url?: string; error?: string; details?: Record<string, string[]> };

      if (!res.ok) {
        if (data.details) {
          setErrors(data.details as CheckoutErrors);
        } else {
          setErrors({ general: data.error ?? "Error inesperado. Inténtalo de nuevo." });
        }
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setErrors({ general: "Error de red. Comprueba tu conexión e inténtalo de nuevo." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ops-card w-full max-w-md p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white text-xl leading-none"
          aria-label="Cerrar"
        >
          ✕
        </button>

        <div className="mb-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">
            Plan {plan.name}
          </span>
          <h2 className="text-2xl font-bold mt-1">{plan.priceLabel}</h2>
          <p className="text-white/60 text-sm mt-1">
            Completa tu información para continuar al pago.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm text-white/70 mb-1.5" htmlFor="email">
              Email de trabajo
            </label>
            <input
              id="email"
              type="email"
              className="ops-input"
              placeholder="tu@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1.5" htmlFor="slug">
              Nombre del workspace
            </label>
            <div className="flex items-center ops-input !p-0 overflow-hidden">
              <span className="pl-4 pr-2 text-white/30 text-sm select-none shrink-0">
                opsly.io/
              </span>
              <input
                id="slug"
                type="text"
                className="bg-transparent flex-1 py-3 pr-4 focus:outline-none text-white placeholder-white/30"
                placeholder="mi-empresa"
                value={slug}
                onChange={(e) => setSlug(sanitizeSlug(e.target.value))}
                minLength={3}
                maxLength={30}
                required
              />
            </div>
            <p className="text-white/30 text-xs mt-1">
              Minúsculas, números y guiones. Ej: {`mi-empresa`}
            </p>
            {errors.slug && (
              <p className="text-red-400 text-xs mt-1">{errors.slug[0]}</p>
            )}
          </div>

          {errors.general && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              {errors.general}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="ops-btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Redirigiendo a pago…" : "Continuar al pago →"}
          </button>

          <p className="text-center text-white/30 text-xs">
            Al continuar, aceptas los{" "}
            <a href="/legal/terms" className="underline hover:text-white/60">
              términos de servicio
            </a>
            . Cancela en cualquier momento.
          </p>
        </form>
      </div>
    </div>
  );
}

/* ─── Pricing card ──────────────────────────────────────────────────────── */

function PricingCard({
  plan,
  onSelect,
}: {
  plan: PlanDef;
  onSelect: (plan: PlanDef) => void;
}) {
  return (
    <div
      className={`ops-card flex flex-col p-8 relative transition-transform duration-200 hover:-translate-y-1 ${
        plan.highlighted
          ? "border-violet-500/60 shadow-[0_0_40px_rgba(139,92,246,0.15)]"
          : ""
      }`}
    >
      {plan.badge && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
          {plan.badge}
        </span>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold">{plan.name}</h3>
        <p className="text-white/50 text-sm mt-1">{plan.description}</p>
      </div>

      <div className="mb-8">
        <span className="text-4xl font-extrabold">
          {plan.price !== null ? `$${plan.price}` : "Custom"}
        </span>
        {plan.price !== null && (
          <span className="text-white/40 text-sm ml-2">/ mes</span>
        )}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
            <span className="text-violet-400 mt-0.5 shrink-0">✓</span>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan)}
        className={
          plan.highlighted
            ? "ops-btn-primary w-full text-center"
            : "ops-btn-ghost w-full text-center"
        }
      >
        {plan.key === "enterprise" ? "Contactar ventas" : "Empezar ahora →"}
      </button>
    </div>
  );
}

/* ─── Feature section ───────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: "⚡",
    title: "Deploy en minutos",
    body: "Crea tu stack de automatización completo (n8n + Uptime Kuma) sin configurar servidores.",
  },
  {
    icon: "🧠",
    title: "IA con control de costos",
    body: "LLM Gateway propio: caché semántico, routing por plan y alertas de presupuesto por tenant.",
  },
  {
    icon: "🔒",
    title: "Zero-Trust por diseño",
    body: "Cada tenant está completamente aislado. Traefik v3 + TLS automático + auditoría de accesos.",
  },
  {
    icon: "📊",
    title: "Métricas en tiempo real",
    body: "Dashboard con CPU, RAM, contenedores, uptime y consumo IA. Todo en un solo lugar.",
  },
  {
    icon: "💾",
    title: "Backups automáticos",
    body: "Copias diarias de todos tus workflows y datos, con verificación de integridad.",
  },
  {
    icon: "🔗",
    title: "API y webhooks",
    body: "Integra Opsly con tus herramientas: webhooks outbound, API REST documentada y SDK TypeScript.",
  },
];

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const [selectedPlan, setSelectedPlan] = useState<PlanDef | null>(null);

  const apiUrl =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_API_URL ?? window.location.origin.replace(/^https?:\/\/web\./, "https://api."))
      : (process.env.NEXT_PUBLIC_API_URL ?? "");

  function handlePlanSelect(plan: PlanDef) {
    if (plan.key === "enterprise") {
      window.location.href = "mailto:hola@opsly.io?subject=Plan Enterprise";
      return;
    }
    setSelectedPlan(plan);
  }

  return (
    <>
      {selectedPlan && (
        <CheckoutModal
          plan={selectedPlan}
          apiUrl={apiUrl}
          onClose={() => setSelectedPlan(null)}
        />
      )}

      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-40 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-bold text-xl tracking-tight ops-gradient-text">
            Opsly
          </span>
          <a
            href={process.env.NEXT_PUBLIC_PORTAL_URL ?? "#"}
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Iniciar sesión →
          </a>
        </div>
      </nav>

      <main className="pt-16">
        {/* ── Hero ── */}
        <section className="relative max-w-5xl mx-auto px-6 pt-32 pb-24 text-center">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-600/10 blur-3xl rounded-full" />
          </div>

          <div className="inline-flex items-center gap-2 bg-violet-600/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-violet-300 text-sm mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Plataforma en producción · 2 tenants activos
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight mb-6">
            Automatización IA
            <br />
            <span className="ops-gradient-text">para tu empresa</span>
          </h1>

          <p className="text-xl text-white/50 max-w-2xl mx-auto mb-10">
            Despliega tu stack de agentes autónomos (n8n + IA) en minutos.
            Sin configurar servidores. Con backups, métricas y SLA garantizado.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#pricing" className="ops-btn-primary text-center">
              Ver planes y precios →
            </a>
            <a
              href={process.env.NEXT_PUBLIC_PORTAL_URL ?? "#"}
              className="ops-btn-ghost text-center"
            >
              Ver demo
            </a>
          </div>
        </section>

        {/* ── Features grid ── */}
        <section className="max-w-6xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-bold text-center mb-4">
            Todo lo que necesitas, listo desde el día 1
          </h2>
          <p className="text-center text-white/50 mb-16 max-w-xl mx-auto">
            Sin DevOps, sin configuraciones complicadas. Opsly gestiona la
            infraestructura para que tú te concentres en automatizar.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="ops-card p-6">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="max-w-6xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-bold text-center mb-4">
            Precios simples y transparentes
          </h2>
          <p className="text-center text-white/50 mb-16 max-w-xl mx-auto">
            Sin costos ocultos. Cancela cuando quieras. Todos los planes
            incluyen infraestructura gestionada, backups y soporte.
          </p>
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {PLANS.map((plan) => (
              <PricingCard key={plan.key} plan={plan} onSelect={handlePlanSelect} />
            ))}
          </div>
          <p className="text-center text-white/30 text-sm mt-10">
            ¿Tienes preguntas?{" "}
            <a
              href="mailto:hola@opsly.io"
              className="underline hover:text-white/60"
            >
              Escríbenos
            </a>{" "}
            y te ayudamos a elegir el plan adecuado.
          </p>
        </section>

        {/* ── Social proof ── */}
        <section className="border-t border-white/5 py-24">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <p className="text-2xl font-bold mb-4">
              "Opsly nos ahorró 3 semanas de configuración y nos dio un stack
              de IA listo para producción en un día."
            </p>
            <p className="text-white/40 text-sm">— CEO, primer cliente en producción</p>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-white/5 py-12">
          <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="font-bold ops-gradient-text">Opsly</span>
            <p className="text-white/30 text-sm">
              © {new Date().getFullYear()} Opsly. Todos los derechos reservados.
            </p>
            <div className="flex gap-6 text-white/30 text-sm">
              <a href="/legal/terms" className="hover:text-white/60">
                Términos
              </a>
              <a href="/legal/privacy" className="hover:text-white/60">
                Privacidad
              </a>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
