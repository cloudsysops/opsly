import Link from 'next/link';
import {
  MoonCard,
  MoonEmptyState,
  MoonPageHeader,
  MoonStatusBadge,
} from '@/components/moon/primitives';
import { listProjects, loadScenes, type ContentProjectStatus } from '@intcloudsysops/content-engine';
import type { MoonHealthTone } from '@/lib/moon/tenant-card';

const STATUS_TONE: Record<ContentProjectStatus, MoonHealthTone> = {
  idea: 'unknown',
  drafting: 'unknown',
  assets_pending: 'warning',
  ready_to_render: 'warning',
  rendering: 'warning',
  ready_for_review: 'healthy',
  approved: 'healthy',
  published: 'healthy',
  failed: 'critical',
  archived: 'unknown',
};

export default async function MoonCreatorPage(): Promise<React.ReactElement> {
  const projects = listProjects();

  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Creator Studio"
        subtitle="Content Engine — proyectos reales de data/content/tenants/**/projects. Local-first: lee del filesystem del monorepo, sin API intermedia."
      />

      {projects.length === 0 ? (
        <MoonEmptyState
          title="Sin content projects"
          description="Crea uno con: npm run content-engine:create -- --tenant SLUG --channel CHANNEL --series SLUG --title TITLE"
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const scenes = loadScenes(project.tenantId, project.id);
            const totalSec = scenes.reduce((sum, s) => sum + s.durationMs, 0) / 1000;
            return (
              <Link key={project.id} href={`/moon/creator/${project.id}`}>
                <MoonCard className="space-y-2 p-4 transition hover:border-violet-400/40">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-sm text-slate-100">{project.id}</p>
                    <MoonStatusBadge tone={STATUS_TONE[project.status]}>{project.status}</MoonStatusBadge>
                  </div>
                  <p className="text-sm text-slate-200">{project.title}</p>
                  <p className="text-xs text-slate-400">
                    {project.tenantId} · {project.channel} · {scenes.length} scenes · {totalSec.toFixed(1)}s
                  </p>
                </MoonCard>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
