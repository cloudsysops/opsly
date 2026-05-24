'use client'

import { Loader2, ShieldCheck, LogIn } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase-browser'

function getRedirectTarget(nextParam: string | null): string {
  const next = nextParam?.trim()
  if (next && next.startsWith('/')) {
    return next
  }
  return '/familias/submissions'
}

export function FamilyGoogleLogin(): React.ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = useMemo(() => getRedirectTarget(searchParams.get('next')), [searchParams])
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        router.replace(next)
        router.refresh()
        return
      }
      setChecking(false)
    })
  }, [next, router])

  async function onGoogleSignIn(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
          : `/auth/callback?next=${encodeURIComponent(next)}`
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      })
      if (oauthError) {
        setError(oauthError.message)
      }
    } catch {
      setError('No se pudo iniciar con Google.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pk-bg">
        <Loader2 className="h-8 w-8 animate-spin text-pk-primary" aria-hidden />
      </div>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-pk-bg px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-pk-border bg-white p-8 shadow-card">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-pk-mutedText">
          <ShieldCheck className="h-4 w-4 text-pk-primary" aria-hidden />
          Acceso familias
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-pk-ink">Entrar con Google</h1>
        <p className="mt-3 text-sm leading-6 text-pk-sub">
          Las familias entran con Google. El acceso de staff sigue separado por invitación y
          contraseña.
        </p>

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 space-y-3">
          <Button type="button" className="w-full" onClick={() => void onGoogleSignIn()} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Redirigiendo a Google…
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" aria-hidden />
                Entrar con Google
              </>
            )}
          </Button>

          <Link
            href="/familias"
            className="inline-flex h-11 w-full items-center justify-center rounded-full border border-pk-border bg-pk-surface text-sm font-semibold text-pk-ink transition hover:border-pk-primary/40 hover:bg-pk-snow"
          >
            Volver al portal
          </Link>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-pk-mutedText">
          Si ya entraste antes, te llevamos directo al panel de familias.
        </p>
      </div>
    </main>
  )
}
