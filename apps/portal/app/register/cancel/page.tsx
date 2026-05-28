import { XCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function RegisterCancelPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4">
      <div className="mx-auto max-w-md text-center">
        <XCircle className="mx-auto h-12 w-12 text-neutral-500" aria-hidden />

        <h1 className="mt-6 text-2xl font-semibold text-neutral-50">
          Pago cancelado
        </h1>

        <p className="mt-3 text-sm leading-6 text-neutral-400">
          El proceso de pago fue cancelado. No se realizó ningún cargo. Si
          cambias de opinión, puedes intentarlo de nuevo cuando quieras.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Button asChild variant="primary" size="lg">
            <Link href="/register">Intentar de nuevo</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Volver al inicio</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
