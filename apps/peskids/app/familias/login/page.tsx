import { Suspense } from 'react';
import { FamilyEmailLogin } from './family-email-login';

export const metadata = {
  title: 'Peskids · Acceso familias',
  description: 'Acceso seguro para familias de Peskids por enlace al correo registrado.',
};

export default function FamiliesLoginPage(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-pk-bg text-pk-sub">
          Cargando…
        </div>
      }
    >
      <FamilyEmailLogin />
    </Suspense>
  );
}
