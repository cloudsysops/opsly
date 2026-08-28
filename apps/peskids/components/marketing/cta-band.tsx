import { PeskidsWave } from '@/components/brand/peskids-logo';
import { PESKIDS_RESERVATION_FORM_HREF } from '@/lib/peskids-landing-config';
import {
  PESKIDS_CTA_BAND_BUTTON,
  PESKIDS_CTA_BAND_DESCRIPTION,
  PESKIDS_CTA_BAND_TITLE,
} from '@/lib/peskids-landing-copy';

/** Banda final: empuja al formulario. WhatsApp solo en header + FAB. */
export function CtaBand(): React.ReactElement {
  return (
    <section className="mx-4 mb-16 sm:mx-8 lg:mx-14">
      <div className="relative overflow-hidden rounded-pk-lg bg-gradient-to-br from-pk-deep to-[#1B607E] px-8 py-14 text-white sm:px-14">
        <PeskidsWave
          color="rgba(76,184,176,0.18)"
          height={100}
          className="absolute bottom-0 left-0 right-0"
        />
        <div className="relative flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {PESKIDS_CTA_BAND_TITLE}
            </h2>
            <p className="mt-4 text-lg text-white/85">{PESKIDS_CTA_BAND_DESCRIPTION}</p>
          </div>
          <a
            href={PESKIDS_RESERVATION_FORM_HREF}
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold text-pk-deep shadow-md transition hover:bg-white/90"
          >
            {PESKIDS_CTA_BAND_BUTTON}
          </a>
        </div>
      </div>
    </section>
  );
}
