'use client';

import useSWR from 'swr';

import { getBaseUrl } from '../../lib/api-client';

type Workstream = {
  id: string;
  name: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  owner: string;
  reviewer: string;
  status: string;
  risk: 'low' | 'medium' | 'high';
  production_touching: boolean;
  pr: number | null;
  next_action: string;
};

type PortfolioResponse = {
  operating_model: string;
  sprint: { cadence_days: number; goal: string };
  summary: {
    active: number;
    blocked: number;
    ready_for_decision: number;
    high_risk_active: number;
    production_touching_active: number;
    wip_limit: number;
    wip_exceeded: boolean;
  };
  workstreams: Workstream[];
};

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`portfolio request failed: ${r.status}`);
  return r.json();
});

export function PortfolioControlPanel() {
  const baseUrl = getBaseUrl();
  const { data, error } = useSWR<PortfolioResponse>(
    `${baseUrl}/api/admin/mission-control/portfolio`,
    fetcher,
    { refreshInterval: 15000 }
  );

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-400">
        Portfolio Control unavailable
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 text-gray-500">
        Loading portfolio...
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Founder + Agent Portfolio</h2>
          <p className="mt-1 text-sm text-gray-400">
            {data.operating_model} · {data.sprint.cadence_days}-day sprint
          </p>
        </div>
        <div className={`rounded-md border px-3 py-2 text-sm ${
          data.summary.wip_exceeded
            ? 'border-red-700 bg-red-950/30 text-red-300'
            : 'border-emerald-700 bg-emerald-950/20 text-emerald-300'
        }`}>
          WIP {data.summary.active}/{data.summary.wip_limit}
        </div>
      </div>

      <div className="rounded-lg border border-cyan-800/60 bg-cyan-950/20 p-4">
        <div className="text-xs uppercase tracking-wide text-cyan-400">Sprint goal</div>
        <div className="mt-1 text-sm text-cyan-100">{data.sprint.goal}</div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ['Active', data.summary.active],
          ['Blocked', data.summary.blocked],
          ['Decision', data.summary.ready_for_decision],
          ['High risk', data.summary.high_risk_active],
          ['Prod-touching', data.summary.production_touching_active],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-xl font-mono text-gray-100">{value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-900/80 text-gray-400">
            <tr>
              <th className="px-3 py-2 text-left">Priority</th>
              <th className="px-3 py-2 text-left">Workstream</th>
              <th className="px-3 py-2 text-left">Owner</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Risk</th>
              <th className="px-3 py-2 text-left">Next</th>
            </tr>
          </thead>
          <tbody>
            {data.workstreams.map((w) => (
              <tr key={w.id} className="border-t border-gray-800 bg-gray-950/30">
                <td className="px-3 py-3 font-mono">{w.priority}</td>
                <td className="px-3 py-3">
                  <div className="font-medium text-gray-100">{w.name}</div>
                  <div className="text-xs text-gray-500">
                    {w.pr ? `PR #${w.pr}` : 'No PR'} · reviewer={w.reviewer}
                  </div>
                </td>
                <td className="px-3 py-3 font-mono text-blue-300">{w.owner}</td>
                <td className="px-3 py-3">{w.status}</td>
                <td className="px-3 py-3">{w.risk}</td>
                <td className="max-w-md px-3 py-3 text-gray-400">{w.next_action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
