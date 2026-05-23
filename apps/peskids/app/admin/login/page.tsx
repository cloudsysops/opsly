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
      document.cookie = `admin-token=${token}; path=/; secure; samesite=strict`
      router.push('/admin')
      router.refresh()
    } catch {
      setError('No se pudo iniciar sesión.')
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
          Ingresa tu token de acceso administrativo.
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-pk-ink">Token de administrador</span>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="pk-input mt-1"
              placeholder="Pega tu token aquí"
              required
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading || !token}>
            {loading ? 'Verificando…' : 'Acceder al dashboard'}
          </Button>
        </form>
      </div>
    </div>
  )
}
