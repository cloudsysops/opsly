import Link from 'next/link';
import {
  MoonCard,
  MoonEmptyState,
  MoonPageHeader,
} from '@/components/moon/primitives';

export default function MoonDeploymentsPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Deployments"
        subtitle="Sin deploy desde UI. Mapear Actions/VPS vía runbooks. Approval-first obligatorio."
        actions={
          <Link href="/moon/health" className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs">
            Health
          </Link>
        }
      />
      <MoonEmptyState
        title="Deploy UI no habilitada"
        description="No hay contrato seguro approval + rollback en Moon. Usar GitHub Actions / scripts documentados. Ver docs/runbooks/DEPLOY-GITHUB-ACTIONS.md y PRODUCTION-CHANGE-WINDOW."
      />
      <MoonCard className="space-y-2 p-4 text-sm text-slate-300">
        <p>Rollback documentado: docs/runbooks/OPSLY-MOON-ROLLBACK.md</p>
        <p>Ventana prod Peskids: America/Bogota 22:00–06:00 salvo hotfix-prod / safe-daytime.</p>
        <p>VPS ~4 GiB: no builds paralelos ni deploy pesado de día.</p>
      </MoonCard>
    </div>
  );
}
