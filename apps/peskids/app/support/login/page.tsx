import { Suspense } from 'react'
import { SupportLogin } from './support-login'

export const metadata = {
  title: 'Peskids · Soporte',
  description: 'Acceso para soporte de Peskids con email y contraseña.',
}

export default function SupportLoginPage(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-pk-bg text-pk-sub">
          Cargando…
        </div>
      }
    >
      <SupportLogin />
    </Suspense>
  )
}
