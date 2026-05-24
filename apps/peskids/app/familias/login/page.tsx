import { Suspense } from 'react'
import { FamilyGoogleLogin } from './family-google-login'

export const metadata = {
  title: 'Peskids · Acceso familias',
  description: 'Acceso para familias de Peskids con Google.',
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
      <FamilyGoogleLogin />
    </Suspense>
  )
}
