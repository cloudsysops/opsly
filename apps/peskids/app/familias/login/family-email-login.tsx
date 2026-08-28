'use client';

import { useState } from 'react';
import Link from 'next/link';

type AccessState = 'idle' | 'submitting' | 'sent' | 'error';

export function FamilyEmailLogin(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [state, setState] = useState<AccessState>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setState('submitting');
    setMessage(null);

    try {
      const response = await fetch('/api/families/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          ...(name.trim() ? { name: name.trim() } : {}),
        }),
      });

      const payload = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setState('error');
        setMessage(payload.error ?? 'No pudimos procesar tu solicitud. Intenta de nuevo.');
        return;
      }

      setState('sent');
      setMessage(
        payload.message ??
          'Si el correo está asociado a una reserva o estudiante activo, te enviamos un enlace seguro.'
      );
    } catch {
      setState('error');
      setMessage('Error de conexión. Revisa tu red e intenta de nuevo.');
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-pk-bg px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-pk-border bg-pk-surface p-8 shadow-lg">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-pk-mutedText">
          Acceso por invitación
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-pk-ink sm:text-3xl">Portal familias</h1>
        <p className="mt-2 text-sm text-pk-sub">
          Ingresa el correo asociado a tu reserva o estudiante. Solo recibirás acceso si ya
          estás invitado al portal de familias de Peskids.
        </p>

        {state === 'sent' ? (
          <div
            className="mt-6 rounded-lg border border-pk-success/30 bg-pk-success/10 p-4 text-sm text-pk-text"
            role="status"
          >
            {message}
            <p className="mt-2 text-pk-sub">
              Revisa bandeja de entrada y spam. El enlace expira en poco tiempo.
            </p>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="family-email" className="block text-sm font-medium text-pk-sub">
                Correo electrónico
              </label>
              <input
                id="family-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border border-pk-border bg-pk-bg px-3 py-2 text-pk-text"
                placeholder="tu@correo.com"
                disabled={state === 'submitting'}
              />
            </div>
            <div>
              <label htmlFor="family-name" className="block text-sm font-medium text-pk-sub">
                Nombre (opcional)
              </label>
              <input
                id="family-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-pk-border bg-pk-bg px-3 py-2 text-pk-text"
                disabled={state === 'submitting'}
              />
            </div>
            {state === 'error' && message ? (
              <p className="text-sm text-pk-danger" role="alert">
                {message}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={state === 'submitting'}
              className="w-full rounded-lg bg-pk-primary px-4 py-2.5 font-medium text-white hover:bg-pk-primary/90 disabled:opacity-60"
            >
              {state === 'submitting' ? 'Enviando…' : 'Solicitar acceso por invitación'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-pk-sub">
          ¿Eres del equipo?{' '}
          <Link href="/admin/login" className="text-pk-primary underline-offset-2 hover:underline">
            Acceso staff
          </Link>
        </p>
      </div>
    </div>
  );
}
