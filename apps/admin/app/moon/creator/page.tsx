import Link from 'next/link';
import {
  MoonCard,
  MoonEmptyState,
  MoonPageHeader,
  MoonStatusBadge,
} from '@/components/moon/primitives';
import { listContentProjects } from '@/lib/content-engine';

function toneForStatus(status: string): 'healthy' | 'warning' | 'critical' {
  if (status === 'ready_for_review' || status === 'approved') return 'healthy';
  if (status === 'failed' || status === 'rejected') return 'critical';
  return 'warning';
}

export default async function MoonCreatorPage(): Promise<React.ReactElement> {
  const projects = await listContentProjects();

  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Creator Studio"
        subtitle="Panel mínimo real del Content Engine. Lee proyectos desde disco y muestra estados, artefactos y rutas."
      />
      {projects.length === 0 ? (
        <MoonEmptyState
          title="Sin proyectos"
          description="Crea un proyecto con la CLI content:create para que aparezca aquí."
        />
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <MoonCard key={project.id} className="space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{project.channel}</p>
                  <Link href={`/moon/creator/projects/${project.id}`} className="text-lg font-semibold text-white">
                    {project.title}
                  </Link>
                  <p className="text-sm text-slate-400">
                    {project.series} · {project.tenantId} · preset {project.preset}
                  </p>
                </div>
                <MoonStatusBadge tone={toneForStatus(project.status)}>{project.status}</MoonStatusBadge>
              </div>
              <dl className="grid gap-3 text-sm text-slate-300 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-500">Scenes</dt>
                  <dd className="font-mono text-lg">{project.sceneCount}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Duration</dt>
                  <dd className="font-mono text-lg">{project.durationSec}s</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Assets</dt>
                  <dd className="font-mono text-lg">{project.assetCount}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Updated</dt>
                  <dd className="font-mono text-lg">{new Date(project.updatedAt).toLocaleString('en-US')}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                <span>final.mp4: {project.finalPath}</span>
                <span>thumbnail.jpg: {project.thumbnailPath}</span>
                <span>captions.srt: {project.captionsPath}</span>
              </div>
            </MoonCard>
          ))}
        </div>
      )}
    </div>
  );
}
