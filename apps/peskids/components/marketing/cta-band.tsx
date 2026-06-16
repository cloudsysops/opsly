import { PeskidsWave } from '@/components/brand/peskids-logo';
import { WhatsAppLink } from '@/components/contact/whatsapp-link';

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
              Trae a tu peque a probar el método. Sin compromiso. Escríbenos por WhatsApp y te
              ayudamos a reservar la clase de prueba.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <WhatsAppLink
              variant="onDark"
              label="Reservar por WhatsApp"
              className="min-w-[200px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
