import type { ReactElement } from 'react'
import { AuthRecoveryHandler } from '@/components/auth/auth-recovery-handler'

export default function AuthRecoveryPage(): ReactElement {
  return (
    <main className="ops-auth-backdrop flex min-h-screen flex-col items-center justify-center px-4">
      <AuthRecoveryHandler />
    </main>
  )
}
