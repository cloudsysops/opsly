import { MoonCard, MoonEmptyState, MoonPageHeader } from '@/components/moon/primitives';
import { loadTenantConfigSummaries } from '@/lib/moon/config-loaders';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function loadN8nCatalogCount(): Promise<number> {
  const candidates = [
    join(process.cwd(), 'config', 'n8n-workflows', 'catalog.json'),
    join(process.cwd(), '..', '..', 'config', 'n8n-workflows', 'catalog.json'),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      const raw = await readFile(path, 'utf8');
      const parsed = JSON.parse(raw) as { workflows?: unknown[] };
      return Array.isArray(parsed.workflows) ? parsed.workflows.length : 0;
    } catch {
      return 0;
    }
  }
  return 0;
}

export default async function MoonAutomationsPage(): Promise<React.ReactElement> {
  const [tenants, catalogCount] = await Promise.all([
    loadTenantConfigSummaries(),
    loadN8nCatalogCount(),
  ]);

  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Automatizaciones"
        subtitle="Inventario read-only. No se activan workflows desde Moon. Dry-run por defecto."
      />
      <MoonCard className="p-4 text-sm text-slate-300">
        Catálogo n8n workflows: <span className="font-mono">{catalogCount}</span> entradas en config
        (si existe). Activación = proceso tenant/ops con approval.
      </MoonCard>
      {tenants.length === 0 ? (
        <MoonEmptyState
          title="Sin tenants en config"
          description="No hay config/tenants para listar stacks de automatización."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {tenants.map((t) => (
            <MoonCard key={t.slug} className="p-4">
              <p className="font-mono text-sm">{t.slug}</p>
              <p className="mt-1 text-xs text-slate-400">
                vertical={t.vertical ?? '—'} · stack={t.stack_type ?? '—'}
              </p>
              <p className="mt-2 text-[11px] text-slate-500">
                Estado de runs n8n: consultar panel tenant / Uptime — no se inventan ejecuciones.
              </p>
            </MoonCard>
          ))}
        </div>
      )}
    </div>
  );
}
