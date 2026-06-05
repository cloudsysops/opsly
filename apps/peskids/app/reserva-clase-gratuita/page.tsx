import { Suspense } from 'react';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { LeadCaptureForm } from '@/components/forms';

export const metadata = {
  title: 'Peskids · Reserva clase gratuita',
  description: 'Reserva una clase de prueba gratis para Peskids.',
};

export default function ReservaClaseGratisPage(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-pk-bg px-4 py-10 sm:px-8 lg:px-14">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <section className="max-w-2xl">
            <p className="pk-eyebrow text-pk-primary">Reserva aquí</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-pk-ink sm:text-5xl">
              Clase de prueba gratis
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-pk-sub">
              Déjanos tus datos para coordinar tu primera clase en sede Llanogrande o a domicilio.
              Esta es la ruta pública de captación para la consultoría y demo comercial.
            </p>
            <div className="mt-8 rounded-3xl border border-pk-primary/20 bg-white/80 p-6 shadow-soft">
              <ul className="space-y-3 text-sm text-pk-sub">
                <li>• Atención por WhatsApp o email después del envío.</li>
                <li>• Captura pública de lead y handoff al flujo operativo.</li>
                <li>• Sin tocar la auth del dashboard ni el flujo de admin.</li>
              </ul>
            </div>
          </section>

          <section className="lg:sticky lg:top-24">
            <Suspense fallback={<div className="rounded-3xl bg-white p-6 shadow-soft">Cargando formulario…</div>}>
              <LeadCaptureForm />
            </Suspense>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
