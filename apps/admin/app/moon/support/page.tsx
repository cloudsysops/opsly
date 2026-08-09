import { redirect } from 'next/navigation';

/** Alias Moon → legacy feedback / soporte plataforma */
export default function MoonSupportPage(): never {
  redirect('/feedback');
}
