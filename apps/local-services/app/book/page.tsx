import type { ReactElement } from 'react';
import { BookingForm } from '@/components/booking-form';

export default function BookPage(): ReactElement {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-xl font-semibold text-white">Reservar — Equipa</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Completa el formulario. La solicitud queda registrada en Opsly para el tenant configurado.
      </p>
      <div className="mt-8">
        <BookingForm />
      </div>
    </main>
  );
}
