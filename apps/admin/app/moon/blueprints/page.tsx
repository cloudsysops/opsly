import {
  MoonCard,
  MoonEmptyState,
  MoonPageHeader,
} from '@/components/moon/primitives';
import { loadVerticalBlueprints } from '@/lib/moon/config-loaders';

export default async function MoonBlueprintsPage(): Promise<React.ReactElement> {
  const blueprints = await loadVerticalBlueprints();
  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Blueprints"
        subtitle="Fuente: config/vertical-blueprints. Read-only. Sin registry paralelo."
      />
      {blueprints.length === 0 ? (
        <MoonEmptyState
          title="Sin blueprints indexados"
          description="Falta config/vertical-blueprints/index.json o está vacío."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {blueprints.map((b) => (
            <MoonCard key={b.id} className="p-4">
              <p className="font-display text-sm font-semibold">{b.label}</p>
              <p className="mt-1 font-mono text-xs text-slate-500">{b.id}</p>
              <p className="mt-2 text-xs text-slate-400">
                reference_tenant: {b.reference_tenant ?? '—'}
              </p>
            </MoonCard>
          ))}
        </div>
      )}
    </div>
  );
}
