import { Suspense } from 'react'
import { FamilyEmailLogin } from './family-email-login'

export const metadata = {
  title: 'Peskids · Portal familias',
  description: 'Acceso al portal de familias Peskids solo por invitación con el correo autorizado.',
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
