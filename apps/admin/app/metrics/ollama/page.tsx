"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

interface OllamaMetric {
  tenant_slug: string;
  total_requests: number;
  total_tokens_input: number;
  total_tokens_output: number;
  cache_hits: number;
  avg_latency_ms: number;
  success_rate: number;
  models_used: string[];
}

interface OllamaTotalMetrics {
  total_requests: number;
  total_tokens: number;
  total_cache_hits: number;
  avg_latency_ms: number;
  success_rate: number;
  by_tenant: OllamaMetric[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminOllamaMetricsPage() {
  const { data: metrics, error, isLoading } = useSWR<OllamaTotalMetrics>(
    "/api/admin/metrics/ollama",
    fetcher,
    { refreshInterval: 30000 }
  );

  if (isLoading) return <div className="p-8">Loading metrics...</div>;
  if (error) return <div className="p-8 text-red-600">Error loading metrics: {error.message}</div>;

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Ollama Metrics (ADR-024)</h1>

      {/* Total Metrics Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <MetricCard
          label="Total Requests"
          value={metrics?.total_requests ?? 0}
          format={(v) => v.toLocaleString()}
        />
        <MetricCard
          label="Total Tokens"
          value={metrics?.total_tokens ?? 0}
          format={(v) => v.toLocaleString()}
        />
        <MetricCard
          label="Cache Hits"
          value={metrics?.total_cache_hits ?? 0}
          format={(v) => v.toLocaleString()}
        />
        <MetricCard
          label="Avg Latency"
          value={metrics?.avg_latency_ms ?? 0}
          format={(v) => v.toFixed(0) + "ms"}
        />
        <MetricCard
          label="Success Rate"
          value={metrics?.success_rate ?? 0}
          format={(v) => (v * 100).toFixed(1) + "%"}
        />
      </div>

      {/* Per-Tenant Breakdown */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Per-Tenant Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-3 text-left">Tenant</th>
                <th className="border p-3 text-right">Requests</th>
                <th className="border p-3 text-right">Tokens (I/O)</th>
                <th className="border p-3 text-right">Cache Hit %</th>
                <th className="border p-3 text-right">Avg Latency</th>
                <th className="border p-3 text-right">Success %</th>
                <th className="border p-3 text-left">Models</th>
              </tr>
            </thead>
            <tbody>
              {metrics?.by_tenant.map((tenant) => (
                <tr key={tenant.tenant_slug} className="hover:bg-gray-50">
                  <td className="border p-3 font-mono">{tenant.tenant_slug}</td>
                  <td className="border p-3 text-right">{tenant.total_requests.toLocaleString()}</td>
                  <td className="border p-3 text-right">
                    {tenant.total_tokens_input.toLocaleString()} / {tenant.total_tokens_output.toLocaleString()}
                  </td>
                  <td className="border p-3 text-right">
                    {((tenant.cache_hits / Math.max(tenant.total_requests, 1)) * 100).toFixed(1)}%
                  </td>
                  <td className="border p-3 text-right">{tenant.avg_latency_ms.toFixed(0)}ms</td>
                  <td className="border p-3 text-right">{(tenant.success_rate * 100).toFixed(1)}%</td>
                  <td className="border p-3 text-sm">{tenant.models_used.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-bold mb-2">ADR-024 Architecture</h3>
        <ul className="text-sm space-y-1">
          <li>
            <strong>Primary Provider:</strong> Ollama Local (Mac 2011 @ 100.80.41.29:11434)
          </li>
          <li>
            <strong>Health Check:</strong> 30-second interval via /api/tags
          </li>
          <li>
            <strong>Fallback Chain:</strong> Claude Haiku → GPT-4o Mini → OpenRouter
          </li>
          <li>
            <strong>Circuit Breaker:</strong> 3 consecutive failures → marked down
          </li>
          <li>
            <strong>Hermes Mode:</strong> Routes decision+S tasks to Ollama when HERMES_LOCAL_LLM_FIRST=true
          </li>
        </ul>
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  format: (v: number) => string;
}

function MetricCard({ label, value, format }: MetricCardProps) {
  return (
    <div className="p-4 border rounded-lg bg-white">
      <p className="text-gray-600 text-sm mb-2">{label}</p>
      <p className="text-2xl font-bold">{format(value)}</p>
    </div>
  );
}
