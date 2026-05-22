'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PeskidsLogo } from '@/components/brand/peskids-logo'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase-browser'

export default function AdminLoginPage(): React.ReactElement {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [error, setError] = useState('')
  const [passkeyError, setPasskeyError] = useState('')

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setLoading(true)
    setError('')
    setPasskeyError('')

    try {
      const supabase = createClient()
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signError) {
        setError(signError.message)
        return
      }

      router.push('/admin')
      router.refresh()
    } catch {
      setError('No se pudo conectar. Revisa que la app esté en marcha.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasskey(): Promise<void> {
    setPasskeyLoading(true)
    setError('')
    setPasskeyError('')

    try {
      const supabase = createClient()
      const { error: signError } = await supabase.auth.signInWithPasskey()
      if (signError) {
        setPasskeyError(signError.message)
        return
      }

      router.push('/admin')
      router.refresh()
    } catch {
      setPasskeyError('No se pudo iniciar con passkey')
    } finally {
      setPasskeyLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-pk-bg px-4">
      <div className="w-full max-w-md rounded-2xl border border-pk-border bg-white p-8 shadow-card">
        <div className="mb-6 flex justify-center">
          <PeskidsLogo size={72} />
        </div>
        <h1 className="font-display text-center text-xl font-semibold text-pk-ink">
          Acceso al panel
        </h1>
        <p className="mt-2 text-center text-sm text-pk-sub">
          Acceso por invitación para admin, soporte y profes. Usa tu cuenta real de Supabase.
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-pk-ink">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pk-input mt-1"
              autoComplete="email"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-pk-ink">Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pk-input mt-1"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {passkeyError ? <p className="text-sm text-red-600">{passkeyError}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Entrando…
              </>
            ) : (
              'Entrar al dashboard'
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => void handlePasskey()}
            disabled={passkeyLoading}
          >
            {passkeyLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Verificando huella…
              </>
            ) : (
              'Entrar con huella o passkey'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
