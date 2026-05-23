'use client'

import { Loader2 } from 'lucide-react'
import { Suspense, useEffect, useState, type ReactElement } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { isPortalTenantUser } from '@/lib/portal-access'
import { createClient } from '@/lib/supabase'

function UpdatePasswordForm(): ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loginError = searchParams.get('error')
    if (loginError) {
      setError(loginError)
    }
    const supabase = createClient()
    void supabase.auth.getSession().then(({ data }) => {
      const session = data.session
      if (!session?.user) {
        setReady(false)
        return
      }
      if (!isPortalTenantUser(session.user)) {
        setError(
          'Esta cuenta no usa el portal Opsly. Si eres equipo Peskids, entra en peskids.op-sly.com/admin/login.'
        )
        setReady(false)
        return
      }
      setReady(true)
    })
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('No se pudo guardar la contraseña. Solicita un enlace nuevo desde /login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="ops-auth-backdrop flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-ops-border/80 bg-ops-surface/60 p-6 shadow-xl shadow-black/30">
        <h1 className="text-center text-xl font-bold text-neutral-100">Nueva contraseña</h1>
        <p className="text-center text-sm text-neutral-500">
          {ready
            ? 'El enlace es válido. Elige una contraseña para tu cuenta del portal.'
            : 'Abre el enlace del correo o solicita uno nuevo en /login.'}
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="input-terminal-caret w-full rounded-sm border border-ops-border bg-ops-bg/80 px-3 py-2.5 text-sm"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Contraseña nueva"
          />
          <input
            type="password"
            value={confirm}
            onChange={(ev) => setConfirm(ev.target.value)}
            className="input-terminal-caret w-full rounded-sm border border-ops-border bg-ops-bg/80 px-3 py-2.5 text-sm"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Confirmar"
          />
          {error ? (
            <p role="alert" className="text-sm text-ops-red">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="primary" className="w-full" disabled={loading || !ready}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Guardando…
              </>
            ) : (
              'Guardar y entrar'
            )}
          </Button>
        </form>
      </div>
    </main>
  )
}

export default function UpdatePasswordPage(): ReactElement {
  return (
    <Suspense
      fallback={
        <main className="ops-auth-backdrop flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-ops-green" aria-hidden />
        </main>
      }
    >
      <UpdatePasswordForm />
    </Suspense>
  )
}
