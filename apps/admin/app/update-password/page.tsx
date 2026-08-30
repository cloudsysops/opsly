'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { isSuperAdminUser } from '@/lib/super-admin'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function UpdatePasswordPage(): React.ReactElement {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      if (!user || !isSuperAdminUser(user)) {
        setError('Solo cuentas de administración de plataforma pueden usar este formulario.')
        setReady(false)
        return
      }
      setReady(true)
    })
  }, [])

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Mínimo 8 caracteres.')
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
      router.replace('/dashboard')
      router.refresh()
    } catch {
      setError('No se pudo guardar. Solicita un enlace nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="ops-auth-backdrop flex min-h-screen flex-col items-center justify-center p-6">
      <Card className="w-full max-w-md border-ops-green/40">
        <CardHeader>
          <CardTitle className="font-mono text-ops-green">Nueva contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Nueva contraseña"
            />
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
            <Button type="submit" className="w-full" disabled={loading || !ready}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Guardando…
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
