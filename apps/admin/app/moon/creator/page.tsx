import Link from 'next/link';
import {
  MoonCard,
  MoonEmptyState,
  MoonPageHeader,
  MoonStatusBadge,
} from '@/components/moon/primitives';
import {
  CREATOR_TABS,
  kanbanColumnFor,
  loadCreatorStudioData,
  parseCreatorTab,
} from '@/lib/moon/creator-data';
import { approveCreatorProjectAction } from './actions';
import type { MoonHealthTone } from '@/lib/moon/tenant-card';

const TAB_LABELS: Record<(typeof CREATOR_TABS)[number], string> = {
  overview: 'Overview',
  ideas: 'Ideas',
  trends: 'Trends',
  productions: 'Productions',
  clips: 'Clips',
  characters: 'Characters',
  brands: 'Brands',
  calendar: 'Calendar',
  approvals: 'Approvals',
  analytics: 'Analytics',
};

const KANBAN_COLUMNS = ['IDEAS', 'RESEARCH', 'SCRIPT', 'ASSETS', 'RENDER', 'REVIEW', 'APPROVED', 'PUBLISHED'];

function toneForStatus(status: string): MoonHealthTone {
  if (status === 'approved' || status === 'published') return 'healthy';
  if (status === 'failed') return 'critical';
  if (status === 'human_review' || status === 'rights_review') return 'warning';
  return 'unknown';
}

export default async function MoonCreatorPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}): Promise<React.ReactElement> {
  const params = await searchParams;
  const tab = parseCreatorTab(params.tab);
  const data = await loadCreatorStudioData();
  const reviewQueue = data.projects.filter(
    (item) => item.project.status === 'human_review' || item.project.status === 'rights_review'
  );

  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Creator Studio"
        subtitle="Content OS multi-tenant. Agentes preparan; humanos aprueban. Sin métricas inventadas."
      />
      <div className="flex flex-wrap gap-2">
        {CREATOR_TABS.map((item) => (
          <Link
            key={item}
            href={`/moon/creator?tab=${item}`}
            className={`rounded-lg border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide ${
              tab === item
                ? 'border-violet-400/50 bg-violet-500/15 text-violet-100'
                : 'border-white/10 text-slate-400'
            }`}
          >
            {TAB_LABELS[item]}
          </Link>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="grid gap-3 md:grid-cols-4">
          <MoonCard className="p-4">
            <p className="font-mono text-[10px] uppercase text-slate-500">Projects</p>
            <p className="mt-1 text-2xl text-slate-50">{data.projects.length}</p>
          </MoonCard>
          <MoonCard className="p-4">
            <p className="font-mono text-[10px] uppercase text-slate-500">Pending review</p>
            <p className="mt-1 text-2xl text-slate-50">{reviewQueue.length}</p>
          </MoonCard>
          <MoonCard className="p-4">
            <p className="font-mono text-[10px] uppercase text-slate-500">Trend candidates</p>
            <p className="mt-1 text-2xl text-slate-50">{data.trends.length}</p>
          </MoonCard>
          <MoonCard className="p-4">
            <p className="font-mono text-[10px] uppercase text-slate-500">Portals</p>
            <p className="mt-1 text-2xl text-slate-50">{data.portals.length}</p>
          </MoonCard>
          <MoonCard className="p-4 md:col-span-4">
            <p className="font-mono text-[10px] uppercase text-slate-500">Universe canon</p>
            <p className="mt-1 text-sm text-slate-100">Foundation v{data.universeFoundation.foundationVersion}</p>
            <p className="mt-1 text-sm text-slate-300">{data.universeFoundation.futureVision.statement}</p>
            <p className="mt-2 font-mono text-[10px] text-slate-500">
              Child safety: {data.universeFoundation.childSafety.length} principles · Non-negotiables:{' '}
              {data.universeFoundation.nonNegotiables.length}
            </p>
          </MoonCard>
        </div>
      ) : null}

      {tab === 'ideas' ? (
        data.projects.filter((item) => item.project.status === 'idea').length === 0 ? (
          <MoonEmptyState title="Sin ideas" description="Crea un proyecto con npm run content:create." />
        ) : (
          <div className="space-y-3">
            {data.projects
              .filter((item) => item.project.status === 'idea')
              .map((item) => (
                <MoonCard key={item.project.id} className="p-4">
                  <p className="text-sm text-slate-100">{item.project.title}</p>
                  <p className="font-mono text-[11px] text-slate-500">
                    {item.project.tenantId} · {item.project.question ?? 'sin pregunta'}
                  </p>
                </MoonCard>
              ))}
          </div>
        )
      ) : null}

      {tab === 'trends' ? (
        data.trends.length === 0 ? (
          <MoonEmptyState
            title="Sin candidatos de tendencia"
            description="Trend Scout solo registra candidatos. No descarga ni publica contenido ajeno."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.trends.map((trend) => (
              <MoonCard key={trend.id} className="space-y-2 p-4">
                <p className="font-mono text-[10px] uppercase text-violet-300">Trend candidate</p>
                <p className="text-sm text-slate-100">{trend.topic}</p>
                <p className="text-xs text-slate-400">Creator: {trend.creatorName}</p>
                <p className="text-xs text-slate-400">Portal: {trend.portal}</p>
                <p className="text-xs text-slate-300">
                  Opportunity {trend.educationalScore}/100 · Angle {trend.suggestedAngle}
                </p>
                <p className="text-sm text-slate-200">NØVA asks: {trend.suggestedQuestion}</p>
                <MoonStatusBadge tone="warning">{trend.rightsRisk}</MoonStatusBadge>
              </MoonCard>
            ))}
          </div>
        )
      ) : null}

      {tab === 'productions' ? (
        data.projects.length === 0 ? (
          <MoonEmptyState title="Sin productions" description="Ejecuta npm run content:demo para generar proyectos reales." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-4">
            {KANBAN_COLUMNS.map((column) => (
              <div key={column} className="space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{column}</p>
                {data.projects
                  .filter((item) => kanbanColumnFor(item.project.status) === column)
                  .map((item) => (
                    <MoonCard key={item.project.id} className="p-3">
                      <p className="text-sm text-slate-100">{item.project.title}</p>
                      <p className="mt-1 font-mono text-[10px] text-slate-500">
                        {item.project.tenantId} · {item.project.mode}
                      </p>
                      <MoonStatusBadge tone={toneForStatus(item.project.status)}>
                        {item.project.status}
                      </MoonStatusBadge>
                    </MoonCard>
                  ))}
              </div>
            ))}
          </div>
        )
      ) : null}

      {tab === 'clips' ? (
        data.projects.every((item) => (item.clipCandidates ?? []).length === 0) ? (
          <MoonEmptyState title="Sin clips" description="Los clips aparecen tras npm run content:discover-clips." />
        ) : (
          <div className="space-y-3">
            {data.projects.flatMap((item) =>
              (item.clipCandidates ?? []).map((clip) => (
                <MoonCard key={`${item.project.id}-${clip.id}`} className="p-4">
                  <p className="text-sm text-slate-100">{clip.hook}</p>
                  <p className="font-mono text-[11px] text-slate-500">
                    {item.project.id} · {clip.start}s–{clip.end}s · score {clip.score}
                  </p>
                </MoonCard>
              ))
            )}
          </div>
        )
      ) : null}

      {tab === 'characters' ? (
        <div className="grid gap-3 md:grid-cols-3">
          {data.characters.map((character) => (
            <MoonCard key={character.id} className="p-4">
              <p className="text-sm text-slate-100">{character.name}</p>
              <p className="text-xs text-slate-400">{character.role}</p>
              <p className="mt-2 font-mono text-[10px] text-slate-500">{character.portals.join(' · ')}</p>
            </MoonCard>
          ))}
        </div>
      ) : null}

      {tab === 'brands' ? (
        <div className="grid gap-3 md:grid-cols-2">
          {data.brands.map((brand) => (
            <MoonCard key={brand.channel} className="p-4">
              <p className="text-sm text-slate-100">{brand.channel}</p>
              <p className="text-xs text-slate-400">CTA {brand.kit.cta}</p>
              <p className="font-mono text-[10px] text-slate-500">{brand.kit.characters.join(' · ')}</p>
            </MoonCard>
          ))}
        </div>
      ) : null}

      {tab === 'calendar' ? (
        data.projects.length === 0 ? (
          <MoonEmptyState title="Sin calendario" description="El calendario lista createdAt de proyectos reales." />
        ) : (
          <div className="space-y-3">
            {data.projects.map((item) => (
              <MoonCard key={item.project.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-slate-100">{item.project.title}</p>
                  <p className="font-mono text-[11px] text-slate-500">{item.project.createdAt}</p>
                </div>
                <MoonStatusBadge tone={toneForStatus(item.project.status)}>{item.project.status}</MoonStatusBadge>
              </MoonCard>
            ))}
          </div>
        )
      ) : null}

      {tab === 'approvals' ? (
        reviewQueue.length === 0 ? (
          <MoonEmptyState
            title="Sin approvals de contenido"
            description="Esta cola lee ContentProjects en human_review / rights_review. No es el sandbox de /api/approval-decisions."
          />
        ) : (
          <div className="space-y-3">
            {reviewQueue.map((item) => (
              <MoonCard key={item.project.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-100">{item.project.title}</p>
                    <p className="font-mono text-[11px] text-slate-500">
                      {item.project.tenantId} · {item.rights?.verdict ?? 'pending'}
                    </p>
                  </div>
                  <MoonStatusBadge tone="warning">{item.project.status}</MoonStatusBadge>
                </div>
                <form action={approveCreatorProjectAction}>
                  <input type="hidden" name="tenantId" value={item.project.tenantId} />
                  <input type="hidden" name="projectId" value={item.project.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-emerald-400/40 px-3 py-1.5 text-xs text-emerald-100"
                  >
                    Approve
                  </button>
                </form>
              </MoonCard>
            ))}
          </div>
        )
      ) : null}

      {tab === 'analytics' ? (
        <MoonEmptyState
          title="Sin fuente de métricas"
          description="No se inventan views, retention ni CTR. El loop de aprendizaje espera analytics reales de plataforma."
        />
      ) : null}
    </div>
  );
}
