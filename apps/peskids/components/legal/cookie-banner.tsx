'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

const STORAGE_KEY = 'pk-cookie-consent'

export function CookieBanner(): React.ReactElement | null {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) setVisible(true)
    } catch {
      // Private browsing or storage blocked — show banner to be safe
      setVisible(true)
    }
  }, [])

  const accept = (): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: true, at: Date.now() }))
    } catch {
      // ignore
    }
    setVisible(false)
  }

  const dismiss = (): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: false, at: Date.now() }))
    } catch {
      // ignore
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-2xl border border-pk-border/80 bg-white/95 p-3 shadow-xl backdrop-blur sm:bottom-5 sm:left-5 sm:right-auto sm:max-w-lg"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-pk-ink">Usamos cookies esenciales</p>
          <p className="mt-1 text-[11px] leading-relaxed text-pk-sub">
            Solo usamos cookies estrictamente necesarias para el funcionamiento del sitio
            (sesión de staff). No hay cookies de rastreo ni publicidad.{' '}
            <Link href="/cookies" className="text-pk-primary hover:underline">
              Ver política
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1 text-pk-sub hover:bg-pk-muted"
          aria-label="Cerrar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={accept}
          className="rounded-lg bg-pk-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-pk-primary/90"
        >
          Entendido
        </button>
        <Link
          href="/cookies"
          className="rounded-lg border border-pk-border px-4 py-1.5 text-xs font-semibold text-pk-sub hover:bg-pk-muted"
        >
          Más información
        </Link>
      </div>
    </div>
  )
}
