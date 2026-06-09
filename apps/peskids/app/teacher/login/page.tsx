import { Suspense } from 'react';
import { TeacherLogin } from './teacher-login';

export const metadata = {
  title: 'Peskids · Acceso profesores',
  description: 'Acceso para profesores de Peskids con email y contraseña.',
};

export default function TeacherLoginPage(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-pk-bg text-pk-sub">
          Cargando…
        </div>
      }
    >
      <TeacherLogin />
    </Suspense>
  );
}
