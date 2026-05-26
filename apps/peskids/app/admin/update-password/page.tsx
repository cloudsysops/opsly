import { UpdatePasswordForm } from '@/components/auth/update-password-form'

export const metadata = {
  title: 'Peskids · Nueva contraseña',
  description: 'Define tu nueva contraseña para acceder al panel administrativo de Peskids.',
}

export default function AdminUpdatePasswordPage(): React.ReactElement {
  return (
    <UpdatePasswordForm
      surface="admin"
      redirectTo="/admin"
      title="Nueva contraseña"
      description="El enlace es válido. Elige una contraseña para tu cuenta de admin."
    />
  )
}
