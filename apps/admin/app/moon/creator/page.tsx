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
import { approveCreatorProjectAction, rejectCreatorProjectAction } from './actions';
import type { MoonHealthTone } from '@/lib/moon/tenant-card';

const TAB_LABELS: Record<(typeof CREATOR_TABS)[number], string> = {
  overview: 'Overview',
  ideas: 'Ideas',
  trends: 'Trends',
  productions: 'Productions',
  clips: 'Clips',
  franchise: 'Franchise',
  characters: 'Characters',
  brands: 'Brands',
  calendar: 'Calendar',
  approvals: 'Approvals',
  analytics: 'Analytics',
};

const KANBAN_COLUMNS = [
  'IDEAS',
  'RESEARCH',
  'SCRIPT',
  'ASSETS',
  'RENDER',
  'REVIEW',
  'APPROVED',
  'PUBLISHED',
];

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
        </div>
      ) : null}

      {tab === 'ideas' ? (
        data.projects.filter((item) => item.project.status === 'idea').length === 0 ? (
          <MoonEmptyState
            title="Sin ideas"
            description="Crea un proyecto con npm run content:create."
          />
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
          <MoonEmptyState
            title="Sin productions"
            description="Ejecuta npm run content:demo para generar proyectos reales."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-4">
            {KANBAN_COLUMNS.map((column) => (
              <div key={column} className="space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                  {column}
                </p>
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
          <MoonEmptyState
            title="Sin clips"
            description="Los clips aparecen tras npm run content:discover-clips."
          />
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

      {tab === 'franchise' ? (
        data.projects.filter((item) => item.transmedia).length === 0 ? (
          <MoonEmptyState
            title="Sin proyectos transmedia"
            description="Los proyectos ligados a juego/historia aparecerán aquí con misión, episodio y superficies."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.projects
              .filter((item) => item.transmedia)
              .map((item) => (
                <MoonCard key={item.project.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-100">{item.project.title}</p>
                      <p className="font-mono text-[10px] uppercase text-violet-300">
                        {item.transmedia?.franchiseId} · {item.transmedia?.seasonId}
                      </p>
                    </div>
                    <MoonStatusBadge tone={toneForStatus(item.project.status)}>
                      {item.project.status}
                    </MoonStatusBadge>
                  </div>
                  <p className="text-xs text-slate-400">
                    Story event: {item.transmedia?.storyEventId}
                  </p>
                  <p className="font-mono text-[11px] text-slate-500">
                    Missions: {(item.transmedia?.missionIds ?? []).join(' · ') || 'none'}
                  </p>
                  <p className="font-mono text-[11px] text-slate-500">
                    Characters: {(item.transmedia?.characterIds ?? []).join(' · ') || 'none'}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(item.transmedia?.surfaces ?? []).map((surface) => (
                      <span
                        key={surface}
                        className="rounded border border-white/10 px-2 py-1 font-mono text-[10px] text-slate-300"
                      >
                        {surface}
                      </span>
                    ))}
                  </div>
                </MoonCard>
              ))}
          </div>
        )
      ) : null}

      {tab === 'characters' ? (
        <div className="grid gap-3 md:grid-cols-3">
          {data.characters.map((character) => (
            <MoonCard key={character.id} className="p-4">
              <p className="text-sm text-slate-100">{character.name}</p>
              <p className="text-xs text-slate-400">{character.role}</p>
              <p className="mt-2 font-mono text-[10px] text-slate-500">
                {character.portals.join(' · ')}
              </p>
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
              <p className="font-mono text-[10px] text-slate-500">
                {brand.kit.characters.join(' · ')}
              </p>
            </MoonCard>
          ))}
        </div>
      ) : null}

      {tab === 'calendar' ? (
        data.projects.length === 0 ? (
          <MoonEmptyState
            title="Sin calendario"
            description="El calendario lista createdAt de proyectos reales."
          />
        ) : (
          <div className="space-y-3">
            {data.projects.map((item) => (
              <MoonCard key={item.project.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-slate-100">{item.project.title}</p>
                  <p className="font-mono text-[11px] text-slate-500">{item.project.createdAt}</p>
                </div>
                <MoonStatusBadge tone={toneForStatus(item.project.status)}>
                  {item.project.status}
                </MoonStatusBadge>
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
                      {item.session?.game ? ` · game ${item.session.game}` : ''}
                    </p>
                  </div>
                  <MoonStatusBadge tone="warning">{item.project.status}</MoonStatusBadge>
                </div>
                {item.aiReview ? (
                  <p className="font-mono text-[11px] text-slate-400">
                    AI {item.aiReview.decision ?? item.aiReview.state} · score {item.aiReview.score?.total ?? '—'} · r
                    {item.aiReview.round}/{item.aiReview.maxRounds} · {item.aiReview.currentVersionId ?? 'v?'}
                  </p>
                ) : null}
                {(item.aiReview?.findings ?? []).slice(0, 3).map((finding) => (
                  <p key={finding.finding_id} className="font-mono text-[11px] text-amber-200/80">
                    {finding.severity} {finding.finding_id} {finding.timecode_start}s–{finding.timecode_end}s · {finding.issue}
                  </p>
                ))}
                {(item.clipCandidates ?? []).length > 0 ? (
                  <ul className="space-y-1 font-mono text-[11px] text-slate-400">
                    {(item.clipCandidates ?? []).slice(0, 5).map((clip) => (
                      <li key={clip.id}>
                        {clip.id} · {clip.start}s–{clip.end}s · score {clip.score}
                        {clip.reasons[0] ? ` · ${clip.reasons[0]}` : ''}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <form action={approveCreatorProjectAction} className="space-y-2">
                    <input type="hidden" name="tenantId" value={item.project.tenantId} />
                    <input type="hidden" name="projectId" value={item.project.id} />
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                      {['youtube', 'tiktok', 'instagram', 'facebook', 'x'].map((platform) => (
                        <label key={platform} className="inline-flex items-center gap-1">
                          <input type="checkbox" name={`platform_${platform}`} defaultChecked={platform === 'youtube'} />
                          {platform}
                        </label>
                      ))}
                    </div>
                    <button
                      type="submit"
                      className="rounded-lg border border-emerald-400/40 px-3 py-1.5 text-xs text-emerald-100"
                    >
                      Approve &amp; Schedule
                    </button>
                  </form>
                  <form action={rejectCreatorProjectAction}>
                    <input type="hidden" name="tenantId" value={item.project.tenantId} />
                    <input type="hidden" name="projectId" value={item.project.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-rose-400/40 px-3 py-1.5 text-xs text-rose-100"
                    >
                      Reject
                    </button>
                  </form>
                </div>
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
