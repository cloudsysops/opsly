/**
 * /admin/tenants/[slug]/graph
 * Graphyfi DAG Visualization Dashboard
 *
 * Features:
 * - Interactive DAG visualization (mermaid/graphviz)
 * - Agent metrics overlay (status, latency, success rate)
 * - Time range selector (24h, 7d, 30d)
 * - Node click → agent/job details
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import mermaid from 'mermaid';

interface GraphData {
  dag?: {
    nodes: Array<{
      id: string;
      type: string;
      label: string;
      status?: string;
      latency_ms?: number;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      type: string;
      label?: string;
    }>;
    metadata?: {
      job_count?: number;
      agent_count?: number;
      event_count?: number;
      avg_latency_ms?: number;
    };
  };
  mermaid_code?: string;
  format?: string;
}

interface AgentData {
  agent_id: string;
  status: 'active' | 'idle' | 'error';
  latency_ms: number;
  jobs_processed: number;
  error_count?: number;
  last_job_at?: string;
}

interface MetricsData {
  tenant_slug: string;
  agents: AgentData[];
  total_jobs_24h: number;
  total_agents_active: number;
  avg_latency_ms: number;
  success_rate?: number;
  timestamp: string;
}

export default function GraphPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const [graph, setGraph] = useState<GraphData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [format, setFormat] = useState<'mermaid' | 'graphviz'>('mermaid');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    const loadGraphData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch graph and metrics in parallel
        const [graphRes, metricsRes] = await Promise.all([
          fetch(`/api/tenants/${slug}/graph/workflows?format=${format}`),
          fetch(`/api/tenants/${slug}/graph/metrics?timeRange=${timeRange}`),
        ]);

        if (!graphRes.ok) throw new Error('Failed to load graph');
        if (!metricsRes.ok) throw new Error('Failed to load metrics');

        const graphData = (await graphRes.json()) as GraphData;
        const metricsData = (await metricsRes.json()) as MetricsData;

        setGraph(graphData);
        setMetrics(metricsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadGraphData();
  }, [slug, timeRange, format]);

  // Initialize mermaid diagram
  useEffect(() => {
    if (graph?.mermaid_code && format === 'mermaid') {
      mermaid.contentLoaded();
    }
  }, [graph, format]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Loading workflow visualization...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <h3 className="text-red-800 font-semibold">Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Workflow Visualization</h1>
        <p className="text-gray-600">Tenant: {slug}</p>
      </div>

      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Time Range</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '24h' | '7d' | '30d')}
            className="mt-1 px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as 'mermaid' | 'graphviz')}
            className="mt-1 px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="mermaid">Mermaid</option>
            <option value="graphviz">Graphviz</option>
          </select>
        </div>
      </div>

      {/* Metrics Summary */}
      {metrics && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm font-medium text-blue-900">Total Jobs (24h)</div>
            <div className="text-2xl font-bold text-blue-600">{metrics.total_jobs_24h}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm font-medium text-green-900">Active Agents</div>
            <div className="text-2xl font-bold text-green-600">{metrics.total_agents_active}</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-sm font-medium text-purple-900">Avg Latency</div>
            <div className="text-2xl font-bold text-purple-600">{metrics.avg_latency_ms}ms</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-sm font-medium text-orange-900">Success Rate</div>
            <div className="text-2xl font-bold text-orange-600">
              {metrics.success_rate ? `${metrics.success_rate}%` : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* DAG Visualization */}
      {graph && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Workflow DAG</h2>

          <div className="border border-gray-300 rounded bg-gray-50 p-4 overflow-x-auto">
            {format === 'mermaid' && graph.mermaid_code && (
              <div className="mermaid">{graph.mermaid_code}</div>
            )}
            {format === 'graphviz' && (
              <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                {graph.mermaid_code}
              </pre>
            )}
          </div>

          {/* Metadata */}
          {graph.dag?.metadata && (
            <div className="mt-4 grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-xs font-medium text-gray-600">Total Nodes</div>
                <div className="text-lg font-semibold text-gray-900">
                  {graph.dag.nodes.length}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-600">Edges</div>
                <div className="text-lg font-semibold text-gray-900">
                  {graph.dag.edges.length}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-600">Agents</div>
                <div className="text-lg font-semibold text-gray-900">
                  {graph.dag.metadata.agent_count || 0}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-600">Events</div>
                <div className="text-lg font-semibold text-gray-900">
                  {graph.dag.metadata.event_count || 0}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Agents Table */}
      {metrics && metrics.agents.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Active Agents</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Agent ID</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Status</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-700">Latency (ms)</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-700">Jobs</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-700">Errors</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Last Job</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {metrics.agents.map((agent) => (
                  <tr
                    key={agent.agent_id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedNode(agent.agent_id)}
                  >
                    <td className="px-6 py-4 font-mono text-xs text-gray-900">
                      {agent.agent_id}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          agent.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : agent.status === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {agent.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">{agent.latency_ms}</td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      {agent.jobs_processed}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      {agent.error_count || 0}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {agent.last_job_at ? new Date(agent.last_job_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Node Details: {selectedNode}</h2>
          <p className="text-gray-600">Click details to view full agent/job information.</p>
        </div>
      )}
    </div>
  );
}
