import OpenWASetup from './OpenWASetup';

export const dynamic = 'force-dynamic';

export default function PeskidsSetupPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <header className="space-y-2">
        <p className="text-sm text-blue-400 font-medium uppercase tracking-wide">
          Peskids · Configuración WhatsApp
        </p>
        <h1 className="text-3xl font-bold">⚙️ Setup WhatsApp OpenWA</h1>
        <p className="text-zinc-400 text-sm">
          Conecta tu número de WhatsApp para recibir y responder mensajes de padres automáticamente.
        </p>
      </header>

      <OpenWASetup tenantName="Peskids" />

      <section className="rounded-xl border border-dashed border-zinc-700 p-4 space-y-2 text-xs text-zinc-500 font-mono">
        <p className="font-sans font-semibold text-zinc-400 text-sm">Variables Doppler requeridas</p>
        <p>OPENWA_API_URL=http://openwa-peskids:2785</p>
        <p>OPENWA_API_KEY=&lt;api-key&gt;</p>
        <p>OPENWA_SESSION_ID=peskids</p>
        <p>OPENWA_WEBHOOK_SECRET=&lt;secreto-hmac&gt;</p>
        <p className="text-zinc-600 pt-1">
          Webhook: https://peskids.op-sly.com/api/webhooks/openwa
        </p>
      </section>
    </main>
  );
}
