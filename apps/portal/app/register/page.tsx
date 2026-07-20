'use client';

import { Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createCheckoutSession, type CheckoutPlan } from '@/lib/checkout';

interface Plan {
  id: CheckoutPlan;
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'startup',
    name: 'Startup',
    price: '$49',
    description: 'Perfecto para equipos pequeños que inician su automatización.',
    features: [
      'Hasta 3 usuarios',
      '5 workflows activos',
      'n8n administrado',
      'Monitoreo de uptime',
      'Backups diarios',
      'Soporte por email',
    ],
    highlighted: false,
  },
  {
    id: 'business',
    name: 'Business',
    price: '$149',
    description: 'Para equipos en crecimiento con necesidades avanzadas.',
    features: [
      'Usuarios ilimitados',
      'Workflows ilimitados',
      'n8n administrado',
      'Monitoreo de uptime',
      'Backups diarios',
      'Alertas en tiempo real',
      'Soporte prioritario',
      'Métricas y reportes',
    ],
    highlighted: true,
  },
];

function slugError(value: string): string | null {
  if (value.length < 3) return 'Debe tener al menos 3 caracteres';
  if (!/^[a-z0-9]/.test(value)) return 'Debe empezar con letra o número';
  if (!/[a-z0-9]$/.test(value)) return 'Debe terminar con letra o número';
  if (!/^[a-z0-9-]+$/.test(value)) return 'Solo letras minúsculas, números y guiones';
  return null;
}

export default function RegisterPage() {
  const router = useRouter();

  const [selectedPlan, setSelectedPlan] = useState<CheckoutPlan>('startup');
  const [email, setEmail] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Email inválido';
    }

    if (!slug.trim()) {
      errors.slug = 'El nombre del workspace es obligatorio';
    } else {
      const sErr = slugError(slug.trim());
      if (sErr) errors.slug = sErr;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setLoading(true);

    try {
      const { url } = await createCheckoutSession(email.trim(), slug.trim(), selectedPlan);
      router.push(url);
    } catch (err: unknown) {
      const e = err as Record<string, unknown> | null;
      if (e?.status === 409) {
        setFieldErrors((prev) => ({ ...prev, slug: String(e.message ?? '') }));
      } else if (e?.message) {
        setError(String(e.message));
      } else {
        setError('Error de conexión. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-neutral-100">
      <nav className="sticky top-0 z-40 border-b border-[#202020] bg-[#0a0a0a]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="font-mono text-lg font-semibold tracking-tight text-[#4ade80]">
            Opsly
          </Link>
          <Button asChild variant="ghost">
            <Link href="/login">Entrar</Link>
          </Button>
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#4ade80]">Registro</p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-neutral-50 sm:text-4xl">
            Lanza tu infraestructura de automatización en minutos
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-400">
            Elige un plan, configura tu workspace y empieza a automatizar con n8n administrado,
            monitoreo y backups incluidos.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mx-auto mt-8 max-w-xl rounded border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400"
          >
            {error}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {PLANS.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative flex flex-col rounded-xl border p-6 text-left transition-all duration-200 ${
                    plan.highlighted
                      ? 'border-[#4ade80]/40 bg-[#4ade80]/[0.04]'
                      : 'border-[#202020] bg-[#141414]'
                  } ${
                    isSelected
                      ? 'ring-2 ring-[#4ade80] ring-offset-2 ring-offset-[#0a0a0a]'
                      : 'hover:border-[#333] hover:bg-[#1a1a1a]'
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-2.5 right-4 rounded-full border border-[#4ade80]/40 bg-[#0a0a0a] px-3 py-0.5 font-mono text-[11px] text-[#4ade80]">
                      Popular
                    </span>
                  )}

                  <h3 className="text-xl font-semibold text-neutral-50">{plan.name}</h3>
                  <div className="mt-3">
                    <span className="text-3xl font-semibold text-neutral-50">{plan.price}</span>
                    <span className="ml-1 text-sm text-neutral-500">/mes</span>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-neutral-500">{plan.description}</p>

                  <ul className="mt-6 flex-1 space-y-2.5 text-sm text-neutral-300">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4ade80]" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <div className="mx-auto mt-10 max-w-xl space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-300">
                Correo electrónico
              </label>
              <Input
                id="email"
                type="email"
                placeholder="tucorreo@ejemplo.com"
                value={email}
                aria-invalid={fieldErrors.email ? 'true' : 'false'}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
                }}
                className={`mt-1.5 ${fieldErrors.email ? 'border-red-500' : ''}`}
                autoComplete="email"
              />
              {fieldErrors.email && (
                <p id="email-error" className="mt-1 text-xs text-red-400">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-neutral-300">
                Nombre del workspace
              </label>
              <Input
                id="slug"
                type="text"
                placeholder="mi-empresa"
                value={slug}
                aria-invalid={fieldErrors.slug ? 'true' : 'false'}
                aria-describedby={fieldErrors.slug ? 'slug-error' : 'slug-description'}
                onChange={(e) => {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                  if (fieldErrors.slug) setFieldErrors((p) => ({ ...p, slug: '' }));
                }}
                className={`mt-1.5 ${fieldErrors.slug ? 'border-red-500' : ''}`}
              />
              {fieldErrors.slug ? (
                <p id="slug-error" className="mt-1 text-xs text-red-400">
                  {fieldErrors.slug}
                </p>
              ) : (
                <p id="slug-description" className="mt-1 text-xs text-neutral-500">
                  3-30 caracteres: solo letras minúsculas, números y guiones
                </p>
              )}
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Creando sesión...
                </>
              ) : (
                `Suscribirse por ${PLANS.find((p) => p.id === selectedPlan)?.price}/mes`
              )}
            </Button>
          </div>
        </form>

        <p className="mx-auto mt-6 max-w-xl text-center text-xs text-neutral-600">
          Al registrarte aceptas nuestros{' '}
          <Link href="/legal/terms" className="underline underline-offset-2 hover:text-neutral-400">
            Términos de servicio
          </Link>{' '}
          y{' '}
          <Link
            href="/legal/privacy"
            className="underline underline-offset-2 hover:text-neutral-400"
          >
            Política de privacidad
          </Link>
          . El pago se procesa de forma segura vía Stripe.
        </p>
      </section>
    </main>
  );
}
