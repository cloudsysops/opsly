'use client'

import { Loader2 } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PeskidsLogo } from '@/components/brand/peskids-logo'
import { Button } from '@/components/ui/button'
import { isStaffUser } from '@/lib/staff-user'
import { createClient } from '@/lib/supabase-browser'

function UpdatePasswordForm(): React.ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

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
      if (!isStaffUser(session.user)) {
        setError(
          'Esta cuenta no tiene acceso al panel Peskids. Solicita acceso al equipo de Peskids.'
        )
        setReady(false)
        return
      }
      setReady(true)
    })
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError('')

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
      router.push('/admin')
      router.refresh()
    } catch {
      setError('No se pudo guardar la contraseña. Solicita un enlace nuevo desde login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-pk-bg px-4">
      <div className="w-full max-w-md rounded-2xl border border-pk-border bg-white p-8 shadow-card">
        <div className="mb-6 flex justify-center">
          <PeskidsLogo size={72} />
        </div>
        <h1 className="font-display text-center text-xl font-semibold text-pk-ink">
          Nueva contraseña
        </h1>
        <p className="mt-2 text-center text-sm text-pk-sub">
          {ready
            ? 'El enlace es válido. Elige una contraseña para tu cuenta.'
            : 'Abre el enlace del correo de recuperación o solicita uno nuevo en login.'}
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-pk-ink">Contraseña nueva</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pk-input mt-1"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-pk-ink">Confirmar</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="pk-input mt-1"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading || !ready}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Guardando…
              </>
            ) : (
              'Guardar y entrar al panel'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function AdminUpdatePasswordPage(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-pk-bg">
          <Loader2 className="h-8 w-8 animate-spin text-pk-mint" aria-hidden />
        </div>
      }
    >
      <UpdatePasswordForm />
    </Suspense>
  )
}
