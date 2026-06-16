import { Suspense } from 'react';
import { getAuthPublicConfig } from '@/lib/auth-public-config';
import { TeacherLogin } from './teacher-login';

export const metadata = {
  title: 'Peskids · Acceso profesores',
  description: 'Acceso para profesores de Peskids con email y contraseña.',
};

export default function TeacherLoginPage(): React.ReactElement {
  const authConfig = getAuthPublicConfig();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-pk-bg text-pk-sub">
          Cargando…
        </div>
      }
    >
      <TeacherLogin authConfig={authConfig} />
    </Suspense>
  );
}
