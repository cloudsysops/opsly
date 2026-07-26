import { PeskidsWave } from '@/components/brand/peskids-logo';
import { GatedWhatsAppLink } from '@/components/marketing/gated-whatsapp-link';

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
              ¿Listo para conocer Peskids?
            </h2>
            <p className="mt-4 text-lg text-white/85">
              Completa el formulario de matrícula con los datos del acudiente y te contactamos para
              orientarte sobre clases en sede o a domicilio.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <GatedWhatsAppLink variant="onDark" label="WhatsApp" />
          </div>
        </div>
      </div>
    </section>
  );
}
