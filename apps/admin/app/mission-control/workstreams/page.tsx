import { WorkstreamsExecutionPanel } from '@/components/mission-control/WorkstreamsExecutionPanel';

export default function MissionControlWorkstreamsPage() {
  return (
    <div className="min-h-screen bg-[#030712] p-4 text-slate-100 lg:p-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-5 border-b border-cyan-500/15 pb-5">
          <h1 className="text-3xl font-semibold tracking-[0.12em] text-cyan-100">WORKSTREAMS</h1>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-400/70">
            one control plane · autonomous + human relay · evidence first
          </p>
        </header>
        <WorkstreamsExecutionPanel />
      </div>
    </div>
  );
}
