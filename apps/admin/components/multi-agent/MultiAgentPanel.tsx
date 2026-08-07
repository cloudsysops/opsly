'use client';

import React, { useEffect, useState } from 'react';
import { useCallback } from 'react';
import type { MultiAgentStatus } from './types';

/**
 * Main Multi-Agent Orchestrator Panel for Opsly Moon Dashboard
 *
 * Displays:
 * - Agent status and availability
 * - Token usage and budget
 * - Executing and queued tasks
 * - Optimization recommendations
 */
export function MultiAgentPanel() {
  const [status, setStatus] = useState<MultiAgentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/multi-agent/status');
      if (!response.ok) throw new Error('Failed to fetch status');
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh status
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStatus, refreshInterval]);

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full" />
        <p className="mt-2 text-gray-600">Loading orchestrator status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold">Error</h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={fetchStatus}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!status) {
    return <div className="p-6 text-gray-500">No status data available</div>;
  }

  const {
    orchestrator,
    tokens,
    agents: registryStatus,
  } = status;

  const metrics = orchestrator.status.aggregated;
  const budgetUsage = tokens.usage.prediction.remainingBudgetPercentage;
  const budgetColor =
    budgetUsage > 50
      ? 'text-green-600'
      : budgetUsage > 20
        ? 'text-yellow-600'
        : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🤖 Multi-Agent Orchestrator</h2>
          <p className="text-sm text-gray-500 mt-1">
            Mission Control — Manage AI agents and task execution
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchStatus}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Refresh
          </button>
          <select
            value={refreshInterval}
            onChange={e => setRefreshInterval(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded hover:border-gray-400"
          >
            <option value={2000}>Auto (2s)</option>
            <option value={5000}>Auto (5s)</option>
            <option value={10000}>Auto (10s)</option>
            <option value={30000}>Auto (30s)</option>
          </select>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Agents Status */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agents</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Active</span>
              <span className="font-semibold">{registryStatus.available}/{registryStatus.total}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Enabled</span>
              <span className="font-semibold">{registryStatus.enabled}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Installed</span>
              <span className="font-semibold">{registryStatus.installed}</span>
            </div>

            {/* Agent List */}
            <div className="mt-4 pt-4 border-t space-y-2">
              {registryStatus.agents.map(agent => (
                <div key={agent.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate">{agent.id}</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      agent.available
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {agent.available ? '✓ Online' : '✗ Offline'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tasks Status */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Executing</span>
              <span className="font-semibold text-blue-600">
                {orchestrator.status.executingTasks}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Queued</span>
              <span className="font-semibold text-yellow-600">
                {orchestrator.status.queuedTasks}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Completed</span>
              <span className="font-semibold text-green-600">{metrics.totalTasksCompleted}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Failed</span>
              <span className="font-semibold text-red-600">{metrics.totalTasksFailed}</span>
            </div>

            {/* Success Rate */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Success Rate</span>
                <span className="font-semibold">
                  {(metrics.averageSuccessRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${metrics.averageSuccessRate * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Token Budget */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Used</span>
              <span className="font-semibold">
                ${tokens.usage.totalCostSpent.toFixed(2)} / $100.00
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tokens Used</span>
              <span className="font-semibold">{tokens.usage.totalTokensUsed.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Projected EOY</span>
              <span className={`font-semibold ${budgetColor}`}>
                ${tokens.usage.prediction.projectedCostByEndOfMonth.toFixed(2)}
              </span>
            </div>

            {/* Budget Progress */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Remaining</span>
                <span className={`font-semibold ${budgetColor}`}>{budgetUsage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    budgetUsage > 50
                      ? 'bg-green-600'
                      : budgetUsage > 20
                        ? 'bg-yellow-600'
                        : 'bg-red-600'
                  }`}
                  style={{ width: `${Math.min(budgetUsage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {tokens.recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 Recommendations</h3>
          <ul className="space-y-2">
            {tokens.recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-blue-800">
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Agent Metrics Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Agent Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-gray-600 font-semibold">Agent</th>
                <th className="px-6 py-3 text-left text-gray-600 font-semibold">Tasks</th>
                <th className="px-6 py-3 text-left text-gray-600 font-semibold">Failed</th>
                <th className="px-6 py-3 text-left text-gray-600 font-semibold">Tokens</th>
                <th className="px-6 py-3 text-left text-gray-600 font-semibold">Cost</th>
                <th className="px-6 py-3 text-left text-gray-600 font-semibold">Success %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tokens.usage.byAgent.map(agentStats => {
                const metrics =
                  orchestrator.status.agents.find(a => a.id === agentStats.agentId)?.metrics || null;
                const successRate = metrics
                  ? (metrics.tasksCompleted / Math.max(1, metrics.tasksCompleted + metrics.tasksFailed)) * 100
                  : 0;

                return (
                  <tr key={agentStats.agentId} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-900 font-medium">{agentStats.agentId}</td>
                    <td className="px-6 py-3 text-gray-600">{metrics?.tasksCompleted || 0}</td>
                    <td className="px-6 py-3 text-gray-600">{metrics?.tasksFailed || 0}</td>
                    <td className="px-6 py-3 text-gray-600">{agentStats.tokensUsed.toLocaleString()}</td>
                    <td className="px-6 py-3 text-gray-600">${agentStats.cost.toFixed(2)}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                        {successRate.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Execution History */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6 text-center text-gray-500">
          <p>Task execution history will appear here</p>
          <p className="text-sm mt-2">Connect to database for full history tracking</p>
        </div>
      </div>
    </div>
  );
}
