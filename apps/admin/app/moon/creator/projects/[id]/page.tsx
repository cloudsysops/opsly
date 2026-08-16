import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  MoonCard,
  MoonPageHeader,
  MoonStatusBadge,
} from '@/components/moon/primitives';
import { loadContentProject } from '@/lib/content-engine';

function toneForStatus(status: string): 'healthy' | 'warning' | 'critical' {
  if (status === 'ready_for_review' || status === 'approved') return 'healthy';
  if (status === 'failed' || status === 'rejected') return 'critical';
  return 'warning';
}

export default async function MoonCreatorProjectPage({
  params,
}: {
  params: { id: string };
}): Promise<React.ReactElement> {
  const { id } = params;
  const project = await loadContentProject(id);
  if (project === null) notFound();
  const detail = project;

  return (
    <div className="space-y-6">
      <MoonPageHeader
        title={detail.title}
        subtitle={`Project ${detail.id} · ${detail.tenantId} · ${detail.channel}`}
        actions={
          <Link href="/moon/creator" className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs">
            Back
          </Link>
        }
      />
      <MoonCard className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 text-sm text-slate-300">
            <p>Series: {detail.series}</p>
            <p>Preset: {detail.preset}</p>
            <p>Duration: {detail.durationSec}s · Scenes: {detail.sceneCount} · Assets: {detail.assetCount}</p>
          </div>
          <MoonStatusBadge tone={toneForStatus(detail.status)}>{detail.status}</MoonStatusBadge>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Scenes</h2>
            <div className="space-y-2">
              {detail.scenes.map((scene) => (
                <div key={scene.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs text-slate-500">#{scene.order}</p>
                    <span className="text-xs text-slate-400">{Math.round(scene.durationMs / 1000)}s</span>
                  </div>
                  <p className="mt-1 text-slate-200">{scene.caption}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    visual: {scene.visualType} · motion: {scene.motion}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">assets: {scene.assetRefs.join(', ')}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Assets & Render</h2>
            <div className="space-y-2">
              {detail.assets.map((asset) => (
                <div key={asset.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                  <p className="font-mono text-xs text-slate-500">{asset.id}</p>
                  <p className="text-slate-200">{asset.type}</p>
                  <p className="break-all text-xs text-slate-500">{asset.path}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Render artifacts</p>
              <p className="mt-2 break-all text-xs text-slate-400">final: {detail.finalPath}</p>
              <p className="mt-1 break-all text-xs text-slate-400">thumbnail: {detail.thumbnailPath}</p>
              <p className="mt-1 break-all text-xs text-slate-400">captions: {detail.captionsPath}</p>
              <p className="mt-1 break-all text-xs text-slate-400">metadata: {detail.metadataPath}</p>
            </div>
          </div>
        </div>
      </MoonCard>
    </div>
  );
}
