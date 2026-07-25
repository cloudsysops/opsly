import { redirect } from 'next/navigation';
import { PESKIDS_RESERVATION_ANCHOR } from '@/lib/peskids-landing-config';

export const metadata = {
  title: 'Peskids · Solicitud de contacto',
  description: 'Completa el formulario de matrícula para que Peskids te contacte.',
};

/** Legacy URL (clase gratis) → home form anchor. Soft-launch: no free-class offer. */
export default function ReservaClaseGratisPage(): never {
  redirect(`/#${PESKIDS_RESERVATION_ANCHOR}`);
}
