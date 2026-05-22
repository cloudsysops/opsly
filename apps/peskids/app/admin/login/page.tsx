'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PeskidsLogo } from '@/components/brand/peskids-logo'

export default function AdminLoginPage(): React.ReactElement {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        credentials: 'include',
      })
      if (!res.ok) {
        setError('Token incorrecto. Usa el valor de DASHBOARD_ADMIN_SECRET en Doppler.')
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
          Pega el token de administración (Doppler: <code className="text-xs">DASHBOARD_ADMIN_SECRET</code>).
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-pk-ink">Token</span>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="pk-input mt-1"
              autoComplete="off"
              required
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar al dashboard'}
          </Button>
        </form>
      </div>
    </div>
  )
}
