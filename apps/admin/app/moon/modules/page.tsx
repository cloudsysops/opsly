import {
  MoonCard,
  MoonEmptyState,
  MoonPageHeader,
  MoonStatusBadge,
} from '@/components/moon/primitives';
import { loadLibModuleRegistry } from '@/lib/moon/config-loaders';
import type { MoonHealthTone } from '@/lib/moon/tenant-card';

function tone(status: string): MoonHealthTone {
  if (status === 'stable') return 'healthy';
  if (status === 'deprecated') return 'warning';
  return 'unknown';
}

export default async function MoonModulesPage(): Promise<React.ReactElement> {
  const modules = await loadLibModuleRegistry();
  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Módulos"
        subtitle="config/modules.json — read-only. Edición/entitlements requieren APIs (#881/#882) + approvals."
      />
      {modules.length === 0 ? (
        <MoonEmptyState title="Registry vacío" description="No se pudo leer config/modules.json." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {modules.map((m) => (
            <MoonCard key={m.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm text-slate-100">{m.name}</p>
                  <p className="text-xs text-slate-500">{m.id}</p>
                </div>
                <MoonStatusBadge tone={tone(m.status)}>{m.status}</MoonStatusBadge>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">{m.description}</p>
              <p className="font-mono text-[10px] text-slate-600">v{m.version}</p>
            </MoonCard>
          ))}
        </div>
      )}
    </div>
  );
}
