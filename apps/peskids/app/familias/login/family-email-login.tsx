'use client'

import { Loader2, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { PeskidsLockup } from '@/components/brand/peskids-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase-browser'

function getRedirectTarget(nextParam: string | null): string {
  const next = nextParam?.trim()
  if (next && next.startsWith('/')) {
    return next
  }
  return '/familias/submissions'
}

export function FamilyEmailLogin(): React.ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = useMemo(() => getRedirectTarget(searchParams.get('next')), [searchParams])
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [success, setSuccess] = useState<string | null>(null)

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

  async function onSendAccessLink(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      setError('Escribe el correo que usaste en la reserva.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/families/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
        }),
      })

      const payload = (await response.json()) as { message?: string; error?: string }

      if (!response.ok) {
        setError(payload.error || 'No se pudo enviar el enlace.')
        return
      }

      setSuccess(payload.message || 'Revisa tu correo para entrar al portal de familias.')
    } catch {
      setError('No se pudo enviar el enlace. Intenta de nuevo en unos minutos.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(60,190,190,0.18),_transparent_34%),linear-gradient(180deg,#f4fbfd_0%,#ecf7fb_48%,#e8f4f8_100%)]">
        <Loader2 className="h-8 w-8 animate-spin text-pk-primary" aria-hidden />
      </div>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(60,190,190,0.2),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,186,75,0.2),_transparent_22%),linear-gradient(180deg,#f6fcfe_0%,#eff8fb_40%,#eaf5f9_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-7rem] h-56 w-56 rounded-full bg-pk-primary/10 blur-3xl" />
        <div className="absolute right-[-6rem] top-24 h-72 w-72 rounded-full bg-pk-secondary/20 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-1/3 h-64 w-64 rounded-full bg-pk-accent/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
          <section className="flex flex-col justify-between rounded-[2rem] border border-white/70 bg-white/60 p-6 shadow-[0_30px_90px_rgba(11,84,102,0.10)] backdrop-blur-xl sm:p-8 lg:p-10">
            <div className="space-y-8">
              <PeskidsLockup height={54} className="items-center" />

              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-pk-primary/15 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-pk-mutedText shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-pk-primary" aria-hidden />
                  Acceso familias
                </div>

                <div className="max-w-xl space-y-4">
                  <h1 className="text-4xl font-semibold tracking-tight text-pk-ink sm:text-5xl lg:text-6xl">
                    Enlace seguro por correo
                  </h1>
                  <p className="max-w-lg text-base leading-7 text-pk-sub sm:text-lg">
                    En Peskids las familias entran con un enlace seguro al correo registrado en la
                    reserva o en la matrícula. El acceso del staff sigue separado por invitación y
                    contraseña.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                'Un enlace por correo autorizado',
                'Sesión directa al panel de familias',
                'No se mezcla con staff ni profesores',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/70 bg-white/80 px-4 py-4 text-sm font-medium text-pk-ink shadow-[0_12px_30px_rgba(11,84,102,0.06)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[2rem] border border-pk-primary/10 bg-white p-6 shadow-[0_30px_90px_rgba(11,84,102,0.14)] sm:p-8 lg:p-10">
            <div className="absolute right-6 top-6 h-16 w-16 rounded-full bg-pk-secondary/15 blur-2xl" />
            <div className="relative">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pk-primary/10 text-pk-primary">
                  <ShieldCheck className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pk-mutedText">
                    Portal seguro
                  </p>
                  <p className="text-sm text-pk-sub">Familias, profes y soporte separados por diseño</p>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-pk-ink sm:text-3xl">
                  Solicita tu enlace de acceso
                </h2>
                <p className="text-sm leading-6 text-pk-sub sm:text-base">
                  Escribe el correo con el que reservaste o con el que se aprobó tu cupo. Si el
                  correo está autorizado, te enviamos un enlace seguro al instante.
                </p>
              </div>

              <form className="mt-6 space-y-4" onSubmit={(event) => void onSendAccessLink(event)}>
                <div className="space-y-2">
                  <label htmlFor="family-email" className="text-sm font-medium text-pk-ink">
                    Correo
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-pk-mutedText" />
                    <Input
                      id="family-email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="maria@correo.com"
                      className="h-12 rounded-full border-pk-border pl-11 text-base"
                      required
                    />
                  </div>
                </div>

                {error ? (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}

                {success ? (
                  <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {success}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  className="h-12 w-full rounded-full text-base shadow-[0_18px_32px_rgba(39,180,135,0.24)]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Enviando enlace…
                    </>
                  ) : (
                    'Enviar enlace seguro'
                  )}
                </Button>

                <Link
                  href="/familias"
                  className="inline-flex h-12 w-full items-center justify-center rounded-full border border-pk-border bg-pk-surface text-sm font-semibold text-pk-ink transition hover:border-pk-primary/40 hover:bg-pk-snow"
                >
                  Volver al portal
                </Link>
              </form>

              <div className="mt-8 rounded-2xl border border-pk-primary/10 bg-pk-surface/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-pk-mutedText">
                  Nota de acceso
                </p>
                <p className="mt-2 text-sm leading-6 text-pk-sub">
                  Este acceso es solo para familias autorizadas. El panel administrativo, de
                  profesores y de soporte tienen su propio login y permisos.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
