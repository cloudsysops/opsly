import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Opsly para agencias digitales',
  description:
    'Automatizacion gestionada, agentes operativos y monitoreo para agencias que quieren escalar cuentas sin contratar mas operaciones.',
};

const packages = [
  {
    name: 'Managed Automation',
    price: '$299/mes',
    setup: '$750 setup',
    description: 'Para agencias que quieren entregar automatizaciones estables sin mantener infra.',
    features: ['n8n administrado', 'Monitoreo y alertas', 'Backups', 'Reporte mensual'],
  },
  {
    name: 'Autonomous Ops',
    price: '$699/mes',
    setup: '$1,500 setup',
    description: 'Para equipos que quieren que Opsly revise fallos, costos y workflows cada semana.',
    features: ['Todo Managed', 'Agentes read-only', 'Mission Control', 'Recomendaciones semanales'],
  },
  {
    name: 'Done-For-You',
    price: 'desde $1,500/mes',
    setup: '$3,000+ setup',
    description: 'Para agencias que quieren que disenen, operemos y mejoremos los workflows.',
    features: ['Implementacion guiada', 'Workflows por cliente', 'Soporte prioritario', 'Roadmap mensual'],
  },
];

const useCases = [
  'Onboarding tecnico de nuevos clientes en 48 horas',
  'Alertas de uptime y seguimiento de incidentes',
  'Reportes operativos recurrentes para cuentas',
  'Automatizaciones entre CRM, forms, email y Slack',
];

export default function ParaAgenciasPage() {
  return (
    <main className="min-h-screen bg-[#070707] text-zinc-100">
      <section className="mx-auto grid min-h-[88vh] max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <a href="/" className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Opsly para agencias
          </a>
          <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            Escala tus cuentas sin contratar mas operaciones
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
            Opsly opera el stack de automatizacion de tus clientes: n8n, monitoreo, backups,
            reportes y agentes que detectan problemas antes de que se vuelvan soporte manual.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="mailto:hola@opsly.io?subject=Demo Opsly para agencias&body=Quiero evaluar Opsly para operar automatizaciones de clientes."
              className="rounded-md bg-cyan-400 px-5 py-3 font-semibold text-black transition hover:bg-cyan-300"
            >
              Agendar diagnostico
            </a>
            <a
              href="#paquetes"
              className="rounded-md border border-zinc-700 px-5 py-3 font-semibold text-zinc-100 transition hover:border-zinc-500"
            >
              Ver paquetes
            </a>
          </div>
          <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-2xl font-semibold text-white">48h</dt>
              <dd className="mt-1 text-zinc-500">primer piloto</dd>
            </div>
            <div>
              <dt className="text-2xl font-semibold text-white">3</dt>
              <dd className="mt-1 text-zinc-500">workflows demo</dd>
            </div>
            <div>
              <dt className="text-2xl font-semibold text-white">$299+</dt>
              <dd className="mt-1 text-zinc-500">MRR inicial</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 shadow-2xl shadow-cyan-950/20">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Mission Control</p>
              <p className="mt-1 font-medium text-white">Agencia Demo</p>
            </div>
            <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
              operativo
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {[
              ['Cliente ecommerce', '12 workflows', '99.98% uptime'],
              ['Cliente salud', '8 workflows', '0 incidentes'],
              ['Cliente B2B SaaS', '15 workflows', '3 alertas resueltas'],
            ].map(([client, workflows, status]) => (
              <div key={client} className="rounded-md border border-zinc-800 bg-black/40 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-white">{client}</p>
                  <span className="h-2 w-2 rounded-full bg-cyan-300" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-zinc-400">
                  <span>{workflows}</span>
                  <span>{status}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-md bg-cyan-400/10 p-4 text-sm text-cyan-100">
            Agente Opsly: revise 2 workflows lentos, actualice reporte semanal y prepare plan de
            optimizacion para aprobacion humana.
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Caso de uso inicial
            </p>
            <h2 className="mt-3 text-3xl font-semibold">Operacion gestionada para cuentas</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {useCases.map((item) => (
              <div key={item} className="rounded-md border border-zinc-800 bg-black/30 p-4">
                <p className="text-zinc-200">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="paquetes" className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Paquetes listos para vender
          </p>
          <h2 className="mt-3 text-3xl font-semibold">Empieza con piloto pagado, no con demo eterna</h2>
          <p className="mt-4 text-zinc-400">
            El precio incluye operacion gestionada. Implementaciones complejas se cotizan como setup
            para proteger margen desde el primer cliente.
          </p>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {packages.map((pkg) => (
            <article key={pkg.name} className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="text-xl font-semibold">{pkg.name}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{pkg.description}</p>
              <div className="mt-6">
                <p className="text-3xl font-semibold text-white">{pkg.price}</p>
                <p className="mt-1 text-sm text-zinc-500">{pkg.setup}</p>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-zinc-300">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-cyan-300">+</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className="mt-10 rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-6">
          <p className="text-lg font-medium text-cyan-50">
            Meta comercial: 3 pilotos pagados en 30 dias. Resultado esperado: $897 MRR minimo +
            setup inicial para financiar implementacion.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-2xl font-semibold">Siguiente paso: diagnostico de 20 minutos</h2>
              <p className="mt-3 max-w-2xl text-zinc-400">
                Revisamos tus cuentas, detectamos 3 automatizaciones con ROI inmediato y te
                devolvemos un plan de piloto con precio fijo.
              </p>
            </div>
            <a
              href="mailto:hola@opsly.io?subject=Diagnostico Opsly para agencias"
              className="rounded-md bg-white px-5 py-3 text-center font-semibold text-black transition hover:bg-zinc-200"
            >
              Pedir diagnostico
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
