import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Opsly Automation CRM para PYMES locales',
  description:
    'CRM automatizado con n8n, monitoreo, portal cliente y workflows listos para negocios locales.',
};

const packages = [
  {
    name: 'Starter',
    price: '$149/mes',
    setup: '$500 setup',
    description: 'Para validar automatizacion con leads, reservas y monitoreo sin equipo tecnico.',
    features: [
      'Tenant n8n + Uptime Kuma',
      'CRM starter workflows',
      'Portal cliente',
      'Reporte mensual basico',
    ],
  },
  {
    name: 'Pro',
    price: '$299/mes',
    setup: '$950 setup',
    description: 'Para negocios que necesitan seguimiento, recordatorios y reportes operativos.',
    features: [
      'Todo Starter',
      'Integraciones email/forms',
      'Alertas y seguimiento semanal',
      'Hasta 10 workflows gestionados',
    ],
  },
  {
    name: 'Agency',
    price: 'desde $699/mes',
    setup: '$1,500+ setup',
    description: 'Para operar varios clientes con un stack repetible y monitoreo centralizado.',
    features: [
      'Multi-tenant para clientes',
      'Workflows clonables',
      'Uptime por cuenta',
      'Roadmap mensual de automatizacion',
    ],
  },
];

const workflowSteps = [
  'Captura lead o reserva desde formulario, landing o webhook',
  'Crea contacto y oportunidad en el CRM operativo',
  'Notifica al equipo y agenda seguimiento automatico',
  'Monitorea servicios criticos y reporta estado al cliente',
];

const proofPoints = [
  ['Portal', 'Login tenant y dashboard cliente ya disponibles'],
  ['Runtime', 'n8n + Uptime Kuma por tenant en VPS'],
  ['Operacion', 'OpenClaw/MCP interno para acelerar entregas'],
  ['Control', 'Health checks antes de cobrar o prometer SLA'],
];

export default function AutomationCrmPage() {
  return (
    <main className="min-h-screen bg-[#070707] text-zinc-100">
      <nav className="border-b border-zinc-900 bg-black/40">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="/" className="text-lg font-semibold text-white">
            Opsly
          </a>
          <div className="flex items-center gap-5 text-sm text-zinc-400">
            <a href="#paquetes" className="transition hover:text-white">
              Paquetes
            </a>
            <a href="https://portal.op-sly.com/login" className="transition hover:text-white">
              Portal
            </a>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[82vh] max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Opsly Automation CRM
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
            Automatizacion CRM lista para negocios locales
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
            Instalamos y operamos un tenant con n8n, monitoreo, portal cliente y workflows de CRM
            para capturar leads, dar seguimiento y reportar resultados sin contratar DevOps.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="mailto:hola@opsly.io?subject=Piloto Opsly Automation CRM&body=Quiero evaluar un piloto CRM para mi negocio local."
              className="rounded-md bg-emerald-300 px-5 py-3 font-semibold text-black transition hover:bg-emerald-200"
            >
              Pedir piloto
            </a>
            <a
              href="#workflow"
              className="rounded-md border border-zinc-700 px-5 py-3 font-semibold text-zinc-100 transition hover:border-zinc-500"
            >
              Ver flujo
            </a>
          </div>
          <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-2xl font-semibold text-white">48h</dt>
              <dd className="mt-1 text-zinc-500">demo operativa</dd>
            </div>
            <div>
              <dt className="text-2xl font-semibold text-white">4</dt>
              <dd className="mt-1 text-zinc-500">workflows base</dd>
            </div>
            <div>
              <dt className="text-2xl font-semibold text-white">$149+</dt>
              <dd className="mt-1 text-zinc-500">MRR inicial</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-emerald-950/20">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Tenant demo</p>
              <p className="mt-1 font-medium text-white">Negocio local</p>
            </div>
            <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
              listo para piloto
            </span>
          </div>
          <div className="mt-5 grid gap-3">
            {[
              ['Lead nuevo', 'Formulario recibido', 'seguimiento creado'],
              ['Reserva', 'Cliente confirmado', 'recordatorio activo'],
              ['Monitoreo', 'Servicios online', 'reporte preparado'],
            ].map(([title, detail, status]) => (
              <div key={title} className="rounded-md border border-zinc-800 bg-black/30 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-white">{title}</p>
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-zinc-400">
                  <span>{detail}</span>
                  <span>{status}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-md bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
            Paquete vendible: automatizacion gestionada mensual con setup inicial, soporte y
            mejoras aprobadas por el cliente.
          </div>
        </div>
      </section>

      <section id="workflow" className="border-y border-zinc-900 bg-zinc-950/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Plug and run
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">El flujo base que vendemos</h2>
            <p className="mt-4 text-zinc-400">
              La promesa comercial es simple: menos seguimiento manual, mas visibilidad y
              automatizaciones que se pueden mejorar cada mes.
            </p>
          </div>
          <div className="grid gap-3">
            {workflowSteps.map((step, index) => (
              <div key={step} className="rounded-md border border-zinc-800 bg-black/30 p-4">
                <p className="text-sm uppercase tracking-[0.14em] text-emerald-300">
                  Paso {index + 1}
                </p>
                <p className="mt-2 text-zinc-100">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="paquetes" className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Paquetes
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white">
            Cobrar por operacion, no por promesas
          </h2>
          <p className="mt-4 text-zinc-400">
            El setup financia la implementacion inicial. La mensualidad cubre monitoreo, soporte y
            mejora continua.
          </p>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {packages.map((pkg) => (
            <article key={pkg.name} className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="text-xl font-semibold text-white">{pkg.name}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{pkg.description}</p>
              <div className="mt-6">
                <p className="text-3xl font-semibold text-white">{pkg.price}</p>
                <p className="mt-1 text-sm text-zinc-500">{pkg.setup}</p>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-zinc-300">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-emerald-300">+</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-4 rounded-lg border border-zinc-800 bg-zinc-950 p-6 lg:grid-cols-4">
          {proofPoints.map(([label, value]) => (
            <div key={label}>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500">
                {label}
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-200">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
