import { UpdatePasswordForm } from '@/components/auth/update-password-form'

export const metadata = {
  title: 'Peskids · Nueva contraseña de profesores',
  description: 'Define tu nueva contraseña para acceder al panel de profesores de Peskids.',
}

export default function TeacherUpdatePasswordPage(): React.ReactElement {
  return (
    <UpdatePasswordForm
      surface="teacher"
      redirectTo="/teacher/dashboard"
      title="Nueva contraseña de profesores"
      description="El enlace es válido. Elige una contraseña para tu cuenta docente."
    />
  )
}
