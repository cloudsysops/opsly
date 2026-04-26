'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ServicePreview({
  icon,
  label,
  url,
  color,
}: {
  icon: string;
  label: string;
  url: string;
  color: string;
}) {
  return (
    <div
      className={
        'flex items-center gap-3 rounded-xl border bg-slate-800/50 p-4 transition-all duration-300 hover:scale-[1.02] ' +
        color
      }
    >
      <span className="text-2xl">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="truncate font-mono text-sm text-slate-200">{url}</p>
      </div>
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
    </div>
  );
}

function QuickStep({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-mono font-bold text-cyan-400 border border-cyan-500/30">
        {n}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-200">{title}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

function Step2Content() {
  const router = useRouter();
  const params = useSearchParams();
  const slug = params.get('slug') ?? 'tu-org';
  const org = params.get('org') ?? 'Tu Organizaci\u00f3n';
  const plan = params.get('plan') ?? 'startup';

  const n8nUrl = `n8n-${slug}.ops.smiletripcare.com`;
  const uptimeUrl = `uptime-${slug}.ops.smiletripcare.com`;

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <div
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center">
            <span className="font-mono text-lg font-bold tracking-widest text-cyan-400">OPSLY</span>
            <p className="mt-1 text-xs font-mono text-slate-500 tracking-widest uppercase">
              Infrastructure Control
            </p>
          </div>

          <div className="flex items-center gap-3">
            {([1, 2] as const).map((n) => (
              <div key={n} className="flex items-center gap-2">
                <div
                  className={[
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-mono font-bold transition-all',
                    n === 2
                      ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
                  ].join(' ')}
                >
                  {n < 2 ? '\u2713' : 2}
                </div>
                <span
                  className={[
                    'text-xs font-mono',
                    n === 2 ? 'text-slate-200' : 'text-slate-500',
                  ].join(' ')}
                >
                  {n === 1 ? 'Tu organizaci\u00f3n' : 'Tu Agente'}
                </span>
                {n < 2 && <div className="w-8 h-px bg-slate-700" />}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center shadow-xl shadow-black/50 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-center">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <span className="text-3xl">\U0001F680</span>
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">
              {'\u00a1'}
              {org}
              {' est\u00e1 lista!'}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Tu infraestructura se est\u00e1 aprovisionando en segundo plano.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs font-mono">
              <span className="text-slate-400">plan:</span>
              <span className="font-bold text-cyan-300 capitalize">{plan}</span>
              <span className="mx-1 text-slate-600">{'\u00b7'}</span>
              <span className="text-slate-400">id:</span>
              <span className="text-emerald-300">{slug}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 shadow-xl shadow-black/50 backdrop-blur-xl">
            <h2 className="mb-4 text-xs font-mono text-slate-400 uppercase tracking-widest">
              Servicios en aprovisionamiento
            </h2>
            <div className="space-y-3">
              <ServicePreview
                icon="\u26a1"
                label="Automatizaci\u00f3n"
                url={n8nUrl}
                color="border-amber-500/20"
              />
              <ServicePreview
                icon="\u2764\ufe0f"
                label="Monitoreo"
                url={uptimeUrl}
                color="border-rose-500/20"
              />
            </div>
            <p className="mt-3 text-[11px] font-mono text-slate-500">
              {
                'Los servicios estar\u00e1n disponibles en \u223c2 minutos. Puedes monitorear el progreso desde el dashboard.'
              }
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 shadow-xl shadow-black/50 backdrop-blur-xl">
            <h2 className="mb-4 text-xs font-mono text-slate-400 uppercase tracking-widest">
              Primeros pasos
            </h2>
            <div className="space-y-4">
              <QuickStep
                n={1}
                title="Accede a tu panel n8n"
                desc={'Crea tu primer workflow de automatizaci\u00f3n en https://' + n8nUrl}
              />
              <QuickStep
                n={2}
                title="Configura monitores"
                desc={'A\u00f1ade tus URLs cr\u00edticas a Uptime Kuma en https://' + uptimeUrl}
              />
              <QuickStep
                n={3}
                title="Conecta tu stack"
                desc="Usa los webhooks de n8n para disparar alertas en Discord, Slack o email."
              />
            </div>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:from-cyan-400 hover:to-indigo-400 hover:shadow-cyan-500/25"
          >
            {'Ir al Dashboard \u2192'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingStep2() {
  return (
    <Suspense>
      <Step2Content />
    </Suspense>
  );
}
