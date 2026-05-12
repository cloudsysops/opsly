'use client';

import React, { useEffect, useState, useCallback } from 'react';

export interface AgentPerformanceSummary {
  agent_role: string;
  total_attempts: number;
  success_rate: number;
  escalation_rate: number;
  iteration_rate: number;
  avg_iterations: number;
  trending: 'improving' | 'stable' | 'declining';
}

export interface IntentAnalytics {
  intent: string;
  total_validations: number;
  success_rate: number;
  escalation_count: number;
  common_errors: string[];
  recommended_model_tier: string;
}

export interface ValidationDashboardMetrics {
  timestamp: string;
  agents: AgentPerformanceSummary[];
  intents: IntentAnalytics[];
  system_health: {
    avg_validation_time_ms: number;
    total_validations_today: number;
    escalation_rate_pct: number;
  };
}

interface DashboardState {
  metrics: ValidationDashboardMetrics | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function ValidationMetricsDashboard() {
  const [state, setState] = useState<DashboardState>({
    metrics: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/validation/metrics', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status}`);
      }

      const data = (await response.json()) as ValidationDashboardMetrics;
      setState({
        metrics: data,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (state.loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Loading validation metrics...</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>Error: {state.error}</p>
      </div>
    );
  }

  if (!state.metrics) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">No metrics available</p>
      </div>
    );
  }

  const { metrics } = state;
  const trendingColor = (trending: string) => {
    switch (trending) {
      case 'improving':
        return 'text-green-600';
      case 'stable':
        return 'text-blue-600';
      case 'declining':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ValidationOrchestrator Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Last updated: {state.lastUpdated?.toLocaleTimeString()}
          </p>
        </div>

        {/* System Health Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Avg Validation Time</h3>
            <p className="text-2xl font-bold text-gray-900">
              {metrics.system_health.avg_validation_time_ms}ms
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Validations Today</h3>
            <p className="text-2xl font-bold text-gray-900">
              {metrics.system_health.total_validations_today}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Escalation Rate</h3>
            <p
              className={`text-2xl font-bold ${
                metrics.system_health.escalation_rate_pct > 10 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {metrics.system_health.escalation_rate_pct.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Agent Performance Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Agent Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {metrics.agents.map((agent) => (
              <div key={agent.agent_role} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {agent.agent_role.charAt(0).toUpperCase() + agent.agent_role.slice(1)}
                  </h3>
                  <span
                    className={`text-sm font-medium px-3 py-1 rounded-full ${trendingColor(agent.trending)}`}
                  >
                    {agent.trending}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Attempts</span>
                    <span className="font-semibold text-gray-900">{agent.total_attempts}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Success Rate</span>
                    <span className="font-semibold text-gray-900">
                      {(agent.success_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Escalation Rate</span>
                    <span className="font-semibold text-gray-900">
                      {(agent.escalation_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Avg Iterations</span>
                    <span className="font-semibold text-gray-900">
                      {agent.avg_iterations.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Intent Analytics Table */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Top Intents by Volume</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Intent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Validations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Success Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Escalations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Recommended Model
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {metrics.intents.map((intent) => (
                  <tr key={intent.intent} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{intent.intent}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{intent.total_validations}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={
                          intent.success_rate > 0.8
                            ? 'text-green-600 font-semibold'
                            : 'text-gray-600'
                        }
                      >
                        {(intent.success_rate * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{intent.escalation_count}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                        {intent.recommended_model_tier}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Refresh Info */}
        <div className="text-center text-sm text-gray-600 pt-8">
          <p>Metrics auto-refresh every 30 seconds</p>
        </div>
      </div>
    </div>
  );
}
