import { Suspense } from 'react'
import { FamilyEmailLogin } from './family-email-login'

export const metadata = {
  title: 'Peskids · Acceso familias',
  description: 'Acceso para familias de Peskids con enlace seguro por correo.',
}

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
  )
}
