'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';

import { getBaseUrl } from '../../lib/api-client';

type AgentTeam = {
  name: string;
  status: 'active' | 'idle' | 'error';
  lastTask: string | null;
  completedTasks: number;
  failedTasks: number;
  avgDurationMs: number;
};

type OrchestratorStatus = {
  mode: string;
  role: string;
  workers: Record<string, { concurrency: number; active: number }>;
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
};

type AgentTeamsResponse = {
  teams: AgentTeam[];
  generated_at: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MissionControlPage() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const baseUrl = useMemo(() => getBaseUrl(), []);

  const { data: teamsData, error: teamsError } = useSWR<AgentTeamsResponse>(
    `${baseUrl}/api/admin/mission-control/teams`,
    fetcher,
    { refreshInterval: 10000 }
  );

  const { data: orchestratorData, error: orchestratorError } = useSWR<OrchestratorStatus>(
    `${baseUrl}/api/admin/mission-control/orchestrator`,
    fetcher,
    { refreshInterval: 5000 }
  );

  const teams = teamsData?.teams ?? [];
  const generatedAt = teamsData?.generated_at;

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Mission Control</h1>
            <p className="text-gray-400 mt-1">OpenClaw Orchestrator Dashboard</p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Orchestrator Status */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Orchestrator Status</h2>
          {orchestratorError ? (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
              Error loading orchestrator status
            </div>
          ) : !orchestratorData ? (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-gray-500">
              Loading...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Mode</div>
                <div className="text-xl font-mono text-blue-400">{orchestratorData.mode}</div>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Role</div>
                <div className="text-xl font-mono text-green-400">{orchestratorData.role}</div>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Queue Waiting</div>
                <div className="text-xl font-mono text-yellow-400">
                  {orchestratorData.queue.waiting}
                </div>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Queue Active</div>
                <div className="text-xl font-mono text-purple-400">
                  {orchestratorData.queue.active}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Queue Stats */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">BullMQ Queue</h2>
          {orchestratorData ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Waiting</div>
                <div className="text-2xl font-mono text-yellow-400">
                  {orchestratorData.queue.waiting}
                </div>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Active</div>
                <div className="text-2xl font-mono text-green-400">
                  {orchestratorData.queue.active}
                </div>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Completed</div>
                <div className="text-2xl font-mono text-blue-400">
                  {orchestratorData.queue.completed}
                </div>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Failed</div>
                <div className="text-2xl font-mono text-red-400">
                  {orchestratorData.queue.failed}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Loading queue stats...</div>
          )}
        </div>

        {/* Worker Status */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Workers</h2>
          {orchestratorData?.workers ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(orchestratorData.workers).map(([name, stats]) => (
                <div key={name} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                  <div className="font-mono text-blue-400 mb-2">{name}</div>
                  <div className="text-sm text-gray-400">
                    <div>Concurrency: {stats.concurrency}</div>
                    <div>Active: {stats.active}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500">Loading workers...</div>
          )}
        </div>

        {/* Agent Teams */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Agent Teams</h2>
          {teamsError ? (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
              Error loading teams
            </div>
          ) : teams.length === 0 ? (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-gray-500">
              No active teams
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <button
                  key={team.name}
                  onClick={() => setSelectedTeam(team.name === selectedTeam ? null : team.name)}
                  className={`text-left bg-gray-900/50 border rounded-lg p-4 transition-all ${
                    selectedTeam === team.name
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="font-mono text-lg text-blue-400">{team.name}</div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        team.status === 'active'
                          ? 'bg-green-900/50 text-green-400'
                          : team.status === 'error'
                            ? 'bg-red-900/50 text-red-400'
                            : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {team.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 space-y-1">
                    <div>Last Task: {team.lastTask ?? 'none'}</div>
                    <div className="flex gap-4 mt-2">
                      <span className="text-green-400">✓ {team.completedTasks}</span>
                      <span className="text-red-400">✗ {team.failedTasks}</span>
                      <span className="text-gray-500">~{team.avgDurationMs}ms</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lanidea Teams Info */}
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-800/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Lanidea Autonomous Teams</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">planner-desayuno</div>
              <div className="text-sm text-gray-400">Planner</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">executor-desayuno</div>
              <div className="text-sm text-gray-400">Executor</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">notifier-desayuno</div>
              <div className="text-sm text-gray-400">Notifier + Auto-sync</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">evolution-agent</div>
              <div className="text-sm text-gray-400">Auto-evolution</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">lider-arquitecto</div>
              <div className="text-sm text-gray-400">Lead Architect</div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-400">
            Use:{' '}
            <code className="bg-gray-800 px-2 py-1 rounded">
              ./scripts/create-lanidea-agents.sh --tenant &lt;slug&gt; --goal "..."
            </code>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          {generatedAt && <span>Last updated: {new Date(generatedAt).toLocaleString()}</span>}
          <span className="mx-2">•</span>
          <span>OpenClaw Orchestrator</span>
        </div>
      </div>
    </div>
  );
}
