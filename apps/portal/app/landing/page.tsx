'use client';

import { ArrowRight, BarChart3, Check, Clock3, ShieldCheck, Wrench } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const packages = [
  {
    name: 'Managed Automation',
    price: '$299/mes',
    setup: '$750 setup',
    description: 'Stack n8n administrado, monitoreo, backups y reporte mensual.',
    features: ['1-3 cuentas cliente', 'Alertas de uptime', 'Backups diarios', 'Soporte por email'],
  },
  {
    name: 'Autonomous Ops',
    price: '$699/mes',
    setup: '$1,500 setup',
    description: 'Agentes read-only revisan fallos, costos y oportunidades de mejora.',
    features: ['Todo Managed', 'Mission Control', 'Revision semanal', 'Aprobaciones humanas'],
  },
  {
    name: 'Done-For-You',
    price: 'desde $1,500/mes',
    setup: '$3,000+ setup',
    description: 'Diseno, implementacion y mejora continua de workflows por cliente.',
    features: ['Workflows a medida', 'Roadmap mensual', 'Soporte prioritario', 'Reporte ejecutivo'],
  },
];

const workflow = [
  {
    icon: Clock3,
    title: 'Diagnostico',
    body: 'Revisamos tus cuentas y elegimos 3 automatizaciones con ROI inmediato.',
  },
  {
    icon: Wrench,
    title: 'Piloto',
    body: 'Montamos el primer stack, workflows, monitoreo y reporte en un entorno controlado.',
  },
  {
    icon: BarChart3,
    title: 'Operacion',
    body: 'Opsly vigila salud, costos y actividad para reducir soporte manual.',
  },
  {
    icon: ShieldCheck,
    title: 'Autonomia segura',
    body: 'Los agentes recomiendan acciones; produccion requiere aprobacion humana.',
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-ops-bg text-neutral-100">
      <nav className="sticky top-0 z-40 border-b border-ops-border bg-ops-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/landing" className="text-xl font-semibold tracking-tight text-neutral-50">
            Opsly
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild variant="primary">
              <a href="mailto:hola@opsly.io?subject=Diagnostico Opsly">Diagnostico</a>
            </Button>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ops-green">
            Portal cliente + operacion gestionada
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight text-neutral-50 sm:text-5xl lg:text-6xl">
            Automatizaciones de clientes sin caos operativo
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-400">
            Opsly te da n8n administrado, monitoreo, backups, reportes y agentes que revisan
            problemas antes de que se conviertan en soporte manual.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="primary" size="lg">
              <a href="mailto:hola@opsly.io?subject=Diagnostico Opsly para agencias">
                Agendar diagnostico
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </Button>
            <Button asChild variant="default" size="lg">
              <Link href="/login">Ver portal</Link>
            </Button>
          </div>
          <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4">
            <div className="border-l border-ops-border pl-4">
              <dt className="text-2xl font-semibold text-neutral-50">48h</dt>
              <dd className="mt-1 text-sm text-neutral-500">primer piloto</dd>
            </div>
            <div className="border-l border-ops-border pl-4">
              <dt className="text-2xl font-semibold text-neutral-50">$299+</dt>
              <dd className="mt-1 text-sm text-neutral-500">MRR inicial</dd>
            </div>
            <div className="border-l border-ops-border pl-4">
              <dt className="text-2xl font-semibold text-neutral-50">3</dt>
              <dd className="mt-1 text-sm text-neutral-500">workflows demo</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-ops-border bg-ops-surface p-5 shadow-xl shadow-black/30">
          <div className="flex items-start justify-between gap-4 border-b border-ops-border pb-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-ops-gray">
                Mission Control
              </p>
              <h2 className="mt-1 text-xl font-semibold text-neutral-50">Agencia Demo</h2>
            </div>
            <span className="rounded-sm border border-ops-green/40 bg-ops-green/10 px-2.5 py-1 text-xs text-ops-green">
              saludable
            </span>
          </div>
          <div className="mt-5 grid gap-3">
            {[
              ['Cliente ecommerce', '12 workflows', '99.98% uptime'],
              ['Cliente salud', '8 workflows', '0 incidentes'],
              ['Cliente B2B SaaS', '15 workflows', '3 alertas resueltas'],
            ].map(([client, workflows, status]) => (
              <div key={client} className="rounded-sm border border-ops-border bg-ops-bg/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-neutral-100">{client}</p>
                  <span className="h-2 w-2 rounded-full bg-ops-green" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-neutral-500">
                  <span>{workflows}</span>
                  <span>{status}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-sm border border-ops-green/20 bg-ops-green/10 p-4 text-sm leading-6 text-neutral-200">
            Agente Opsly: revise workflows lentos, actualice reporte semanal y prepare plan de
            optimizacion para aprobacion humana.
          </p>
        </div>
      </section>

      <section className="border-y border-ops-border bg-ops-surface/35">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
          {workflow.map((item) => (
            <article key={item.title} className="rounded-sm border border-ops-border bg-ops-bg/60 p-5">
              <item.icon className="h-5 w-5 text-ops-green" aria-hidden />
              <h3 className="mt-4 font-semibold text-neutral-50">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-500">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="planes" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ops-green">
            Paquetes comerciales
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-neutral-50">
            Pilotos pagados, margen protegido
          </h2>
          <p className="mt-4 leading-7 text-neutral-400">
            El setup paga la implementacion inicial; el MRR paga operacion, monitoreo y mejora
            continua. Sin prometer produccion autonoma sin aprobacion.
          </p>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {packages.map((pkg) => (
            <article key={pkg.name} className="flex flex-col rounded-lg border border-ops-border bg-ops-surface p-6">
              <h3 className="text-xl font-semibold text-neutral-50">{pkg.name}</h3>
              <p className="mt-3 min-h-16 text-sm leading-6 text-neutral-500">{pkg.description}</p>
              <div className="mt-6">
                <p className="text-3xl font-semibold text-neutral-50">{pkg.price}</p>
                <p className="mt-1 text-sm text-neutral-500">{pkg.setup}</p>
              </div>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-neutral-300">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-ops-green" aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="primary" className="mt-7 w-full">
                <a href={`mailto:hola@opsly.io?subject=${encodeURIComponent(pkg.name)}`}>
                  Solicitar piloto
                </a>
              </Button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
