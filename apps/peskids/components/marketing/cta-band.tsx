import { PeskidsWave } from '@/components/brand/peskids-logo';
import { PESKIDS_CHAT_SECTION_ANCHOR } from '@/lib/peskids-landing-copy';

/** Banda final: empuja al chat. WhatsApp solo en header + FAB. */
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
              ¿Tienes preguntas?
            </h2>
            <p className="mt-4 text-lg text-white/85">
              Responde unas preguntas y te conectaremos con el asesor adecuado para tu sede.
            </p>
          </div>
          <a
            href={`#${PESKIDS_CHAT_SECTION_ANCHOR}`}
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold text-pk-deep shadow-md transition hover:bg-white/90"
          >
            Abrir chat de información
          </a>
        </div>
      </div>
    </section>
  );
}
