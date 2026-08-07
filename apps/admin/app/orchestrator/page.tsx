'use client';

import React, { useCallback, useEffect, useState } from 'react';

/**
 * Panel de visibilidad para el sistema Local-First existente
 * (lib/runtime/) y el registro de agentes externos
 * (lib/external-agent-registry/). No es un orquestador nuevo:
 * es la primera vez que estos datos se muestran en Opsly Moon.
 */

interface OrchestratorStatus {
  success: boolean;
  localFirst: {
    available: boolean;
    localAgents: string[];
    ollamaRunning: boolean;
    recommendation: string;
    budget: {
      monthlyBudgetUsd: number;
      spentUsd: number;
      remainingPercentage: number;
      projectedMonthlySpendUsd: number;
      byWorker: Array<{
        workerType: string;
        jobsCompleted: number;
        jobsFailed: number;
        tokensUsed: number;
        costUsd: number;
        successRate: number;
      }>;
      recommendations: string[];
    };
  };
  externalAgents: {
    defaultWorkerId: string | null;
    enabled: Array<{
      id: string;
      command: string;
      capabilities: string[];
      riskCeiling: string;
      writeAccess: boolean;
    }>;
  };
}

export default function OrchestratorPage() {
  const [status, setStatus] = useState<OrchestratorStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/orchestrator/status');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load status');
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setDispatching(true);
    setDispatchResult(null);
    try {
      const res = await fetch('/api/orchestrator/dispatch-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Dispatch failed');

      setDispatchResult(
        `Job ${data.results[0]?.jobId ?? ''} → ${data.results[0]?.success ? '✅ éxito' : '❌ falló'} (worker: ${data.results[0]?.workerType ?? 'n/a'})`
      );
      setMessage('');
      fetchStatus();
    } catch (err) {
      setDispatchResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDispatching(false);
    }
  };

  if (error) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </main>
    );
  }

  if (!status) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-8 text-gray-500">Cargando estado del orquestador…</main>
    );
  }

  const { localFirst, externalAgents } = status;

  return (
    <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orquestador Local-First</h1>
        <p className="text-sm text-gray-500 mt-1">
          Estado de lib/runtime/ (selección de workers) y lib/external-agent-registry/ (binarios externos)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Entorno Local</h3>
          <p className="text-sm text-gray-600">
            Disponible: <strong>{localFirst.available ? 'Sí' : 'No'}</strong>
          </p>
          <p className="text-sm text-gray-600">
            Agentes locales: <strong>{localFirst.localAgents.join(', ') || 'ninguno'}</strong>
          </p>
          <p className="text-sm text-gray-600">
            Ollama: <strong>{localFirst.ollamaRunning ? 'corriendo' : 'apagado'}</strong>
          </p>
          <p className="text-sm text-gray-600">
            Recomendado: <strong>{localFirst.recommendation}</strong>
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Presupuesto</h3>
          <p className="text-sm text-gray-600">
            Gastado: <strong>${localFirst.budget.spentUsd.toFixed(2)} / ${localFirst.budget.monthlyBudgetUsd}</strong>
          </p>
          <p className="text-sm text-gray-600">
            Proyectado: <strong>${localFirst.budget.projectedMonthlySpendUsd.toFixed(2)}</strong>
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${Math.min(100, 100 - localFirst.budget.remainingPercentage)}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Agentes Externos</h3>
          <p className="text-sm text-gray-600 mb-2">
            Default: <strong>{externalAgents.defaultWorkerId ?? 'n/a'}</strong>
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            {externalAgents.enabled.map(agent => (
              <li key={agent.id}>
                {agent.id} <span className="text-gray-400">({agent.riskCeiling})</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {localFirst.budget.byWorker.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Uso por worker</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Worker</th>
                <th className="px-4 py-2 text-left">Jobs OK</th>
                <th className="px-4 py-2 text-left">Fallidos</th>
                <th className="px-4 py-2 text-left">Tokens</th>
                <th className="px-4 py-2 text-left">Costo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {localFirst.budget.byWorker.map(w => (
                <tr key={w.workerType}>
                  <td className="px-4 py-2">{w.workerType}</td>
                  <td className="px-4 py-2">{w.jobsCompleted}</td>
                  <td className="px-4 py-2">{w.jobsFailed}</td>
                  <td className="px-4 py-2">{w.tokensUsed.toLocaleString()}</td>
                  <td className="px-4 py-2">${w.costUsd.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Ejecutar tarea</h3>
        <form onSubmit={handleDispatch} className="space-y-3">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Ej: Ejecuta PESKIDS-1.1"
            disabled={dispatching}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            rows={2}
          />
          <button
            type="submit"
            disabled={dispatching || !message.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400"
          >
            {dispatching ? 'Enviando…' : 'Ejecutar'}
          </button>
          {dispatchResult && <p className="text-sm text-gray-700">{dispatchResult}</p>}
        </form>
      </div>
    </main>
  );
}
