import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function RegisterSuccessPage(props: SuccessPageProps) {
  const searchParams = await props.searchParams;
  const sessionId = searchParams.session_id ?? null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4">
      <div className="mx-auto max-w-md text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-[#4ade80]" aria-hidden />

        <h1 className="mt-6 text-2xl font-semibold text-neutral-50">
          Pago confirmado
        </h1>

        <p className="mt-3 text-sm leading-6 text-neutral-400">
          Tu workspace se está preparando. En unos minutos tendrás acceso a tu
          panel de administración con n8n, monitoreo y todas las herramientas
          incluidas en tu plan.
        </p>

        <div className="mt-6 rounded-xl border border-[#202020] bg-[#141414] p-4 text-left text-sm">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Tiempo estimado</span>
            <span className="font-mono text-neutral-200">2-5 minutos</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-neutral-500">Estado</span>
            <span className="flex items-center gap-1.5 font-mono text-[#4ade80]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4ade80]" />
              Provisionando
            </span>
          </div>
          {sessionId && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-neutral-500">ID de sesión</span>
              <span className="max-w-[180px] truncate font-mono text-[11px] text-neutral-500">
                {sessionId}
              </span>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Button asChild variant="primary" size="lg">
            <Link href="/login">Ir al portal</Link>
          </Button>
          <p className="text-xs text-neutral-600">
            ¿No recibes el acceso? Revisa tu bandeja de entrada o{' '}
            <a
              href="mailto:soporte@opsly.io"
              className="underline underline-offset-2 hover:text-neutral-400"
            >
              contacta a soporte
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
