import Link from 'next/link';
import {
  MoonCard,
  MoonEmptyState,
  MoonPageHeader,
} from '@/components/moon/primitives';
import {
  loadAcademyBlueprintSummary,
  loadVerticalBlueprints,
} from '@/lib/moon/config-loaders';

export default async function MoonBlueprintsPage(): Promise<React.ReactElement> {
  const [blueprints, academy] = await Promise.all([
    loadVerticalBlueprints(),
    loadAcademyBlueprintSummary(),
  ]);

  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Blueprints"
        subtitle="Fuentes: config/vertical-blueprints + config/blueprints/academy. Read-only. Sin registry paralelo."
      />
      {blueprints.length === 0 && !academy ? (
        <MoonEmptyState
          title="Sin blueprints indexados"
          description="Falta config/vertical-blueprints/index.json y academy pack."
        />
      ) : null}
      {academy ? (
        <MoonCard className="space-y-2 p-4">
          <p className="font-display text-sm font-semibold text-slate-100">{academy.label}</p>
          <p className="font-mono text-xs text-slate-500">
            id={academy.id} · path={academy.path}
          </p>
          <p className="text-xs text-slate-400">
            Módulos yaml listados: {academy.modules_listed}
            {academy.has_readme ? ' · README presente' : ''}
          </p>
          <p className="text-[10px] text-slate-600">
            Generador academy (#875) no asumido mergeado — inventario estático únicamente.
          </p>
        </MoonCard>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {blueprints.map((b) => (
          <MoonCard key={b.id} className="p-4">
            <p className="font-mono text-sm text-slate-100">{b.id}</p>
            <p className="mt-1 text-sm text-slate-300">{b.label}</p>
            <p className="mt-2 text-xs text-slate-500">
              reference_tenant={b.reference_tenant ?? '—'}
            </p>
          </MoonCard>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Mutación: approval-first + API real. Hoy:{' '}
        <Link href="/moon/modules" className="text-violet-300 underline">
          módulos lib
        </Link>
        .
      </p>
    </div>
  );
}
