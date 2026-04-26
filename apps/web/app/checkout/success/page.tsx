import Link from 'next/link';

export const metadata = {
  title: '¡Bienvenido a Opsly! — Tu workspace está siendo preparado',
};

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-24">
      {/* Ambient glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-violet-600/10 blur-3xl rounded-full" />
      </div>

      <div className="max-w-lg w-full text-center">
        <div className="text-6xl mb-6">🎉</div>

        <h1 className="text-4xl font-extrabold mb-4">¡Pago completado!</h1>

        <p className="text-white/60 text-lg mb-8 leading-relaxed">
          Estamos preparando tu workspace. Recibirás un email con tus credenciales de acceso en los
          próximos <strong className="text-white">5 minutos</strong>.
        </p>

        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 text-left mb-8 space-y-3">
          <h2 className="font-semibold text-white mb-4">¿Qué pasa ahora?</h2>
          {[
            {
              step: '1',
              title: 'Desplegamos tu stack',
              body: 'n8n + Uptime Kuma en tu VPS dedicado, con TLS automático.',
            },
            {
              step: '2',
              title: 'Te enviamos el email',
              body: 'Recibirás un enlace de activación para configurar tu contraseña.',
            },
            {
              step: '3',
              title: 'Accedes a tu portal',
              body: 'Dashboard con todas tus herramientas listas para automatizar.',
            },
          ].map(({ step, title, body }) => (
            <div key={step} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-violet-600/20 text-violet-400 text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                {step}
              </div>
              <div>
                <p className="font-medium text-white/90">{title}</p>
                <p className="text-white/50 text-sm">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-white/40 text-sm mb-8">
          ¿No recibes el email en 10 minutos?{' '}
          <a
            href="mailto:soporte@opsly.io"
            className="text-violet-400 hover:text-violet-300 underline"
          >
            Contáctanos
          </a>
          .
        </p>

        <Link href="/" className="text-white/40 hover:text-white/60 text-sm transition-colors">
          ← Volver al inicio
        </Link>
      </div>
    </main>
  );
}
