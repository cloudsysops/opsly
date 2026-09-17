import type { MissionControlReleaseProjectionV1 } from '@/lib/mission-control-release-v1';

const stateClass = {
  PASSED: 'border-emerald-400/25 bg-emerald-400/5 text-emerald-200',
  PENDING: 'border-amber-400/25 bg-amber-400/5 text-amber-200',
  BLOCKED: 'border-rose-400/25 bg-rose-400/5 text-rose-200',
  UNKNOWN: 'border-slate-500/25 bg-slate-500/5 text-slate-300',
} as const;

export function ReleasePipelinePanel({
  projection,
}: {
  projection: MissionControlReleaseProjectionV1;
}) {
  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {projection.stages.map((stage) => (
          <article
            key={stage.id}
            className={`rounded-xl border p-4 ${stateClass[stage.state]}`}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-mono text-xs font-semibold tracking-[0.12em]">
                {stage.id}
              </h2>
              <span className="rounded border border-current/20 px-2 py-1 font-mono text-[10px]">
                {stage.state}
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-300">{stage.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-cyan-500/15 bg-slate-950/70 p-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-cyan-100">Release candidate evidence</h2>
              <p className="mt-1 font-mono text-[11px] text-cyan-400/60">
                confidence={projection.confidence}
              </p>
            </div>
            <div className="text-right font-mono text-[11px] text-slate-400">
              <div>candidate={projection.candidate_id ?? 'UNKNOWN'}</div>
              <div>sha={projection.commit_sha?.slice(0, 12) ?? 'UNKNOWN'}</div>
            </div>
          </div>

          {projection.artifacts.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-2 pr-4 font-medium">Service</th>
                    <th className="pb-2 font-medium">Immutable artifact</th>
                  </tr>
                </thead>
                <tbody>
                  {projection.artifacts.map((artifact) => (
                    <tr key={`${artifact.name}:${artifact.immutable_ref}`} className="border-t border-white/5">
                      <td className="py-2 pr-4 font-mono text-cyan-200">{artifact.name}</td>
                      <td className="max-w-0 truncate py-2 font-mono text-slate-400" title={artifact.immutable_ref}>
                        {artifact.immutable_ref}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-slate-700/50 bg-black/20 p-3 text-xs text-slate-400">
              No immutable candidate artifact evidence is bound yet.
            </p>
          )}
        </article>

        <article className="rounded-xl border border-rose-500/15 bg-slate-950/70 p-4">
          <h2 className="text-sm font-semibold text-rose-100">Blockers</h2>
          {projection.blockers.length > 0 ? (
            <ul className="mt-3 space-y-2 font-mono text-[11px] text-rose-200/80">
              {projection.blockers.map((blocker) => (
                <li key={blocker} className="rounded border border-rose-500/10 bg-rose-500/5 px-2 py-2">
                  {blocker}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-emerald-300">No candidate blockers reported.</p>
          )}
        </article>
      </section>

      <section className="rounded-xl border border-cyan-500/15 bg-cyan-500/[0.03] p-4">
        <h2 className="text-sm font-semibold text-cyan-100">Evidence refs</h2>
        {projection.evidence_refs.length > 0 ? (
          <ul className="mt-3 space-y-1 font-mono text-[11px] text-cyan-300/70">
            {projection.evidence_refs.map((ref) => <li key={ref}>{ref}</li>)}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-slate-400">
            No evidence source is bound. The UI stays UNKNOWN instead of fabricating release state.
          </p>
        )}
      </section>
    </div>
  );
}
