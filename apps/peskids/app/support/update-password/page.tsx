import { UpdatePasswordForm } from '@/components/auth/update-password-form'

export const metadata = {
  title: 'Peskids · Nueva contraseña de soporte',
  description: 'Define tu nueva contraseña para acceder al panel de soporte de Peskids.',
}

export default function SupportUpdatePasswordPage(): React.ReactElement {
  return (
    <UpdatePasswordForm
      surface="support"
      redirectTo="/support/dashboard"
      title="Nueva contraseña de soporte"
      description="El enlace es válido. Elige una contraseña para tu cuenta de soporte."
    />
  )
}
