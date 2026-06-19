'use client';

type ReservationLandingCTAProps = {
  whatsappUrl: string;
  formAnchorId?: string;
};

export function ReservationLandingCTA({
  whatsappUrl,
  formAnchorId = 'reserva-form',
}: ReservationLandingCTAProps): React.ReactElement {
  return (
    <div className="mb-8 flex flex-col justify-center gap-3 sm:flex-row">
      <button
        onClick={(): void => {
          document.getElementById(formAnchorId)?.scrollIntoView({ behavior: 'smooth' });
        }}
        className="rounded-lg bg-pk-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-pk-primary/90"
        type="button"
      >
        Reservar clase de prueba
      </button>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg border-2 border-pk-primary bg-white px-6 py-3 font-semibold text-pk-primary transition-colors hover:bg-pk-primary/5"
      >
        Hablar por WhatsApp
      </a>
    </div>
  );
}
