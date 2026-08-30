import { AuthRecoveryHandler } from '@/components/auth/auth-recovery-handler'

export default function AuthRecoveryPage(): React.ReactElement {
  return (
    <main className="ops-auth-backdrop flex min-h-screen flex-col items-center justify-center p-6">
      <AuthRecoveryHandler />
    </main>
  )
}
