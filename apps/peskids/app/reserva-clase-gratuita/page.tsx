import { redirect } from 'next/navigation';
import { PESKIDS_RESERVATION_ANCHOR } from '@/lib/peskids-landing-config';

export const metadata = {
  title: 'Peskids · Reserva clase gratuita',
  description: 'Reserva una clase de prueba gratis para Peskids.',
};

/** Legacy URL → canonical home reservation anchor (Option A). */
export default function ReservaClaseGratisPage(): never {
  redirect(`/#${PESKIDS_RESERVATION_ANCHOR}`);
}
