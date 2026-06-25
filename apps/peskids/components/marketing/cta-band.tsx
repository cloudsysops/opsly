import Link from 'next/link';
import { PeskidsWave } from '@/components/brand/peskids-logo';
import { PESKIDS_RESERVATION_FORM_HREF } from '@/lib/peskids-landing-config';

export function CtaBand(): React.ReactElement {
  return (
    <section className="mx-4 mb-16 sm:mx-8 lg:mx-14">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-pk-deep to-[#1B607E] px-8 py-14 text-white sm:px-14">
        <PeskidsWave
          color="rgba(76,184,176,0.18)"
          height={100}
          className="absolute bottom-0 left-0 right-0"
        />
        <div className="relative flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              La primera clase es gratis.
            </h2>
            <p className="mt-4 text-lg text-white/85">
              Completa el formulario con los datos del acudiente y te contactamos para coordinar la
              clase de prueba.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={PESKIDS_RESERVATION_FORM_HREF}
              className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-full bg-pk-primary px-6 text-sm font-bold text-white shadow-lg transition hover:bg-pk-primary/90"
            >
              Ir al formulario
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
