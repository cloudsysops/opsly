export default function ParaAgenciasPage() {
  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Asistido por IA</p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">
          Opsly para agencias digitales que quieren escalar sin contratar mas operaciones
        </h1>
        <p className="mt-6 max-w-3xl text-lg text-zinc-300">
          Despliega automatizaciones por cliente, monitorea uptime y entrega reportes en menos tiempo
          usando un stack multi-tenant listo para produccion.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="/"
            className="rounded-md bg-cyan-500 px-5 py-3 font-medium text-black transition hover:bg-cyan-400"
          >
            Solicitar demo guiada
          </a>
          <a
            href="/"
            className="rounded-md border border-zinc-700 px-5 py-3 font-medium text-zinc-200 transition hover:border-zinc-500"
          >
            Ver caso de uso
          </a>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-20 md:grid-cols-3">
        <article className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-6">
          <h2 className="text-lg font-semibold">Onboarding por cliente</h2>
          <p className="mt-3 text-zinc-400">
            Estandariza arranque de nuevos clientes con flujos y monitoreo replicables.
          </p>
        </article>
        <article className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-6">
          <h2 className="text-lg font-semibold">Operacion mas eficiente</h2>
          <p className="mt-3 text-zinc-400">
            Menos tareas manuales repetitivas y mas foco en estrategia para tus cuentas.
          </p>
        </article>
        <article className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-6">
          <h2 className="text-lg font-semibold">Costo predecible</h2>
          <p className="mt-3 text-zinc-400">
            Planes claros para crecer desde pilotos hasta operaciones enterprise.
          </p>
        </article>
      </section>
    </main>
  );
}
