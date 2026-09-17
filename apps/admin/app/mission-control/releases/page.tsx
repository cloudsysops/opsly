import { ReleasePipelinePanel } from '@/components/mission-control/releases/ReleasePipelinePanel';
import { buildMissionControlReleaseProjectionV1 } from '@/lib/mission-control-release-v1';

export default function MissionControlReleasesPage() {
  // No candidate store/adapter exists on main yet. Stay fail-closed until the
  // staging ReleaseCandidateV1 evidence lane (#1636) is bound to this read model.
  const projection = buildMissionControlReleaseProjectionV1(null);

  return (
    <div className="min-h-screen bg-[#030712] p-4 text-slate-100 lg:p-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-5 border-b border-cyan-500/15 pb-5">
          <h1 className="text-3xl font-semibold tracking-[0.12em] text-cyan-100">
            RELEASE CONTROL
          </h1>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-400/70">
            staging first · immutable candidates · explicit production promotion
          </p>
        </header>
        <ReleasePipelinePanel projection={projection} />
      </div>
    </div>
  );
}
