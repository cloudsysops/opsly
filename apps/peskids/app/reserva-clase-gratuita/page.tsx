import { redirect } from 'next/navigation';
import { PESKIDS_RESERVATION_ANCHOR } from '@/lib/peskids-landing-config';

export const metadata = {
  title: 'Peskids · Solicitud de contacto',
  description: 'Abre el chat de información en la página principal y el equipo de Peskids te contacta.',
};

/** Legacy URL (clase gratis) → home form anchor. Soft-launch: no free-class offer. */
export default function ReservaClaseGratisPage(): never {
  redirect(`/#${PESKIDS_RESERVATION_ANCHOR}`);
}
