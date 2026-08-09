import {
  MoonCard,
  MoonEmptyState,
  MoonPageHeader,
  MoonStatusBadge,
} from '@/components/moon/primitives';
import { loadConfiguredVentures } from '@/lib/moon/config-loaders';

export default async function MoonVenturesPage(): Promise<React.ReactElement> {
  const ventures = await loadConfiguredVentures();
  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Venture Studio"
        subtitle="Solo ventures en config/ventures.json o persistidas. No se inventan productos."
      />
      {ventures.length === 0 ? (
        <MoonEmptyState
          title="Sin ventures configuradas"
          description="Crea config/ventures.json (dry-run / documentación) o persiste ventures vía API futura. No inventamos Salud Journey ni demos."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {ventures.map((v) => (
            <MoonCard key={v.id} className="p-4">
              <div className="flex justify-between gap-2">
                <p className="font-display text-sm font-semibold">{v.name}</p>
                <MoonStatusBadge tone="unknown">{v.status}</MoonStatusBadge>
              </div>
              <p className="mt-2 font-mono text-xs text-slate-500">{v.id}</p>
              <p className="text-[10px] text-slate-600">{v.source}</p>
            </MoonCard>
          ))}
        </div>
      )}
    </div>
  );
}
