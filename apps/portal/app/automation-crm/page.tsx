import { ArrowRight, Check, ClipboardList, Gauge, MonitorCheck, Workflow } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';

const packages = [
  {
    name: 'Starter',
    price: '$149/mes',
    setup: '$500 setup',
    description: 'Para validar CRM automatizado con leads, reservas y monitoreo.',
    features: ['Tenant n8n + Uptime', 'CRM starter workflows', 'Portal cliente', 'Reporte basico'],
  },
  {
    name: 'Pro',
    price: '$299/mes',
    setup: '$950 setup',
    description: 'Para negocios que necesitan seguimiento, recordatorios y reportes.',
    features: ['Todo Starter', 'Email/forms', 'Seguimiento semanal', 'Hasta 10 workflows'],
  },
  {
    name: 'Agency',
    price: 'desde $699/mes',
    setup: '$1,500+ setup',
    description: 'Para operar varios clientes con un stack repetible.',
    features: ['Multi-tenant', 'Workflows clonables', 'Uptime por cuenta', 'Roadmap mensual'],
  },
];

const workflow = [
  {
    icon: ClipboardList,
    title: 'Captura',
    body: 'Lead, reserva o solicitud entra desde formulario, landing o webhook.',
  },
  {
    icon: Workflow,
    title: 'Automatizacion',
    body: 'n8n crea seguimiento, notifica al equipo y mantiene el estado visible.',
  },
  {
    icon: MonitorCheck,
    title: 'Monitoreo',
    body: 'Uptime Kuma valida servicios criticos y reduce soporte reactivo.',
  },
  {
    icon: Gauge,
    title: 'Reporte',
    body: 'Opsly consolida actividad, salud y proximas mejoras del tenant.',
  },
];

export default function AutomationCrmPage(): ReactElement {
  return (
    <main className="min-h-screen bg-ops-bg text-neutral-100">
      <nav className="sticky top-0 z-40 border-b border-ops-border bg-ops-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/automation-crm" className="text-xl font-semibold tracking-tight text-neutral-50">
            Opsly Automation CRM
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild variant="primary">
              <a href="mailto:hola@opsly.io?subject=Piloto Opsly Automation CRM">Pedir piloto</a>
            </Button>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ops-green">
            Para PYMES locales
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight text-neutral-50 sm:text-5xl lg:text-6xl">
            CRM automatizado listo para vender, operar y medir
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-400">
            Opsly instala un tenant con n8n, Uptime Kuma, portal cliente y workflows CRM para
            capturar leads, hacer seguimiento y reportar resultados sin contratar DevOps.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="primary" size="lg">
              <a href="mailto:hola@opsly.io?subject=Piloto Opsly Automation CRM">
                Solicitar piloto
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </Button>
            <Button asChild variant="default" size="lg">
              <Link href="#paquetes">Ver paquetes</Link>
            </Button>
          </div>
          <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4">
            <div className="border-l border-ops-border pl-4">
              <dt className="text-2xl font-semibold text-neutral-50">48h</dt>
              <dd className="mt-1 text-sm text-neutral-500">demo operativa</dd>
            </div>
            <div className="border-l border-ops-border pl-4">
              <dt className="text-2xl font-semibold text-neutral-50">4</dt>
              <dd className="mt-1 text-sm text-neutral-500">workflows base</dd>
            </div>
            <div className="border-l border-ops-border pl-4">
              <dt className="text-2xl font-semibold text-neutral-50">$149+</dt>
              <dd className="mt-1 text-sm text-neutral-500">MRR inicial</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-ops-border bg-ops-surface p-5 shadow-xl shadow-black/30">
          <div className="flex items-start justify-between gap-4 border-b border-ops-border pb-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-ops-gray">
                Tenant demo
              </p>
              <h2 className="mt-1 text-xl font-semibold text-neutral-50">Negocio local</h2>
            </div>
            <span className="rounded-sm border border-ops-green/40 bg-ops-green/10 px-2.5 py-1 text-xs text-ops-green">
              listo para piloto
            </span>
          </div>
          <div className="mt-5 grid gap-3">
            {[
              ['Lead nuevo', 'Formulario recibido', 'seguimiento creado'],
              ['Reserva', 'Cliente confirmado', 'recordatorio activo'],
              ['Monitoreo', 'Servicios online', 'reporte preparado'],
            ].map(([title, detail, status]) => (
              <div key={title} className="rounded-sm border border-ops-border bg-ops-bg/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-neutral-100">{title}</p>
                  <span className="h-2 w-2 rounded-full bg-ops-green" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-neutral-500">
                  <span>{detail}</span>
                  <span>{status}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-sm border border-ops-green/20 bg-ops-green/10 p-4 text-sm leading-6 text-neutral-200">
            La oferta se vende como servicio gestionado: setup inicial, mensualidad, soporte y
            mejoras aprobadas por el cliente.
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

      <section id="paquetes" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ops-green">
            Paquetes comerciales
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-neutral-50">
            Empezar con piloto pagado, no con demo eterna
          </h2>
          <p className="mt-4 leading-7 text-neutral-400">
            El setup paga implementacion. El MRR paga operacion, monitoreo y mejora continua.
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
