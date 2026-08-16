import { existsSync } from 'node:fs';
import { notFound } from 'next/navigation';
import {
  MoonCard,
  MoonPageHeader,
  MoonStatusBadge,
} from '@/components/moon/primitives';
import {
  artifactsDir,
  captionsPath,
  finalVideoPath,
  loadAssets,
  loadProject,
  loadScenes,
  metadataPath,
  ProjectNotFoundError,
  thumbnailPath,
  validateProject,
  type ContentProjectStatus,
} from '@intcloudsysops/content-engine';
import type { MoonHealthTone } from '@/lib/moon/tenant-card';
import { approveContentProject, rejectContentProject } from '../actions';

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

export default async function MoonCreatorProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;

  let project;
  try {
    project = loadProject(id);
  } catch (error) {
    if (error instanceof ProjectNotFoundError) notFound();
    throw error;
  }

  const scenes = loadScenes(project.tenantId, project.id);
  const assets = loadAssets(project.tenantId, project.id);
  const validation = validateProject(project, scenes, assets);

  const finalPath = finalVideoPath(project.id);
  const thumbPath = thumbnailPath(project.id);
  const captionsFile = captionsPath(project.id);
  const metadataFile = metadataPath(project.id);
  const hasFinalVideo = existsSync(finalPath);

  const approveAction = approveContentProject.bind(null, project.id);
  const rejectAction = rejectContentProject.bind(null, project.id);

  return (
    <div className="space-y-6">
      <MoonPageHeader
        title={project.title}
        subtitle={`${project.id} · ${project.tenantId} · ${project.channel} · serie: ${project.series}`}
        actions={<MoonStatusBadge tone={STATUS_TONE[project.status]}>{project.status}</MoonStatusBadge>}
      />

      <MoonCard className="space-y-3 p-4">
        <h2 className="font-display text-sm font-semibold text-slate-100">Validación</h2>
        <p className="text-xs text-slate-400">
          {validation.valid ? 'CONTENT_PROJECT_VALID' : 'CONTENT_PROJECT_INVALID'} — {validation.sceneCount} scenes,{' '}
          {validation.totalDurationSec.toFixed(1)}s, assets {validation.assetsResolved}/{validation.assetsExpected},
          voice {validation.voiceResolved}/{validation.voiceExpected}, ready to render:{' '}
          {validation.readyToRender ? 'YES' : 'NO'}
        </p>
        {validation.issues.length > 0 ? (
          <ul className="space-y-1 text-xs text-red-300">
            {validation.issues.map((issue, i) => (
              <li key={i}>
                [{issue.code}] {issue.message}
              </li>
            ))}
          </ul>
        ) : null}
      </MoonCard>

      <MoonCard className="space-y-3 p-4">
        <h2 className="font-display text-sm font-semibold text-slate-100">Scenes ({scenes.length})</h2>
        <div className="space-y-2">
          {[...scenes]
            .sort((a, b) => a.order - b.order)
            .map((scene) => (
              <div key={scene.id} className="rounded-lg border border-white/10 p-3 text-xs text-slate-300">
                <p className="font-mono text-slate-100">
                  Scene {scene.order} · {(scene.durationMs / 1000).toFixed(1)}s · {scene.motion} · {scene.transition}
                </p>
                {scene.caption ? <p className="mt-1 text-slate-400">caption: {scene.caption}</p> : null}
                <p className="mt-1 text-slate-500">
                  assets: {scene.assetRefs.join(', ') || '(none)'} {scene.voiceover ? `· voice: ${scene.voiceover}` : ''}
                </p>
              </div>
            ))}
        </div>
      </MoonCard>

      <MoonCard className="space-y-3 p-4">
        <h2 className="font-display text-sm font-semibold text-slate-100">Assets ({assets.length})</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {assets.map((asset) => (
            <div key={asset.id} className="rounded-lg border border-white/10 p-2 text-xs text-slate-300">
              <p className="font-mono">
                {asset.type} · {asset.source}
              </p>
              <p className="text-slate-500">{asset.path}</p>
            </div>
          ))}
        </div>
      </MoonCard>

      <MoonCard className="space-y-2 p-4">
        <h2 className="font-display text-sm font-semibold text-slate-100">Render output</h2>
        <p className="text-xs text-slate-400">
          artifacts dir: <span className="font-mono">{artifactsDir(project.id)}</span>
        </p>
        <p className="text-xs text-slate-400">
          final.mp4:{' '}
          <span className="font-mono">{hasFinalVideo ? finalPath : `(not rendered yet — run: npm run content:render -- ${project.id})`}</span>
        </p>
        <p className="text-xs text-slate-400">
          thumbnail: <span className="font-mono">{existsSync(thumbPath) ? thumbPath : '(not generated yet)'}</span>
        </p>
        <p className="text-xs text-slate-400">
          captions: <span className="font-mono">{existsSync(captionsFile) ? captionsFile : '(not rendered yet)'}</span>
        </p>
        <p className="text-xs text-slate-400">
          metadata: <span className="font-mono">{existsSync(metadataFile) ? metadataFile : '(not generated yet)'}</span>
        </p>
      </MoonCard>

      {project.status === 'ready_for_review' ? (
        <MoonCard className="space-y-3 p-4">
          <h2 className="font-display text-sm font-semibold text-slate-100">Review</h2>
          <div className="flex flex-wrap gap-3">
            <form action={async () => { 'use server'; await approveAction('moon-ui'); }}>
              <button
                type="submit"
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200"
              >
                Approve
              </button>
            </form>
            <form action={async (formData: FormData) => { 'use server'; await rejectAction(String(formData.get('notes') ?? '')); }} className="flex gap-2">
              <input
                type="text"
                name="notes"
                placeholder="Motivo del rechazo"
                className="rounded-lg border border-white/15 bg-transparent px-2 py-1.5 text-xs text-slate-200"
              />
              <button
                type="submit"
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-200"
              >
                Reject
              </button>
            </form>
          </div>
        </MoonCard>
      ) : null}

      {project.approval ? (
        <MoonCard className="space-y-1 p-4 text-xs text-slate-400">
          <h2 className="font-display text-sm font-semibold text-slate-100">Approval</h2>
          <p>status: {project.approval.status}</p>
          {project.approval.approvedBy ? <p>approvedBy: {project.approval.approvedBy}</p> : null}
          {project.approval.approvedAt ? <p>approvedAt: {project.approval.approvedAt}</p> : null}
          {project.approval.reviewNotes ? <p>notes: {project.approval.reviewNotes}</p> : null}
        </MoonCard>
      ) : null}
    </div>
  );
}
