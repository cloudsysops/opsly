'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Play, PlugZap, Square, TerminalSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  executePortalAgentMcpTool,
  fetchPortalAgentMcpTools,
  fetchPortalAgentOutput,
  fetchPortalAgentSessions,
  startPortalAgentTerminal,
  stopPortalAgentTerminal,
} from '@/lib/tenant';
import type { AgentIdeTerminalSession } from '@/types';

type PortalAgentIdeConsoleProps = {
  accessToken: string;
  tenantSlug: string;
  plan: string;
};

const DEFAULT_COMMANDS = 'pwd\nprintf "tenant: $PWD\\n"';

function commandsFromText(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function statusTone(status: AgentIdeTerminalSession['status']): string {
  if (status === 'running') return 'text-ops-green';
  if (status === 'completed') return 'text-neutral-100';
  if (status === 'failed') return 'text-red-400';
  return 'text-neutral-500';
}

export function PortalAgentIdeConsole({ accessToken, tenantSlug, plan }: PortalAgentIdeConsoleProps) {
  const [agentId, setAgentId] = useState('cursor');
  const [objective, setObjective] = useState('Revisar estado operativo del tenant');
  const [commandsText, setCommandsText] = useState(DEFAULT_COMMANDS);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [output, setOutput] = useState('');
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mcpResult, setMcpResult] = useState<string | null>(null);

  const { data: sessionsData, mutate: refreshSessions } = useSWR(
    accessToken.length > 0 ? ['portal-agent-sessions', tenantSlug, agentId] : null,
    () => fetchPortalAgentSessions(accessToken, tenantSlug, agentId),
    { refreshInterval: 4000 }
  );
  const { data: mcpCatalog } = useSWR(
    accessToken.length > 0 ? ['portal-agent-mcp-tools', tenantSlug] : null,
    () => fetchPortalAgentMcpTools(accessToken, tenantSlug)
  );

  const selectedSession = useMemo(
    () => sessionsData?.sessions.find((session) => session.session_id === selectedSessionId) ?? null,
    [selectedSessionId, sessionsData?.sessions]
  );

  useEffect(() => {
    const firstSession = sessionsData?.sessions[0];
    if (selectedSessionId === null && firstSession) {
      setSelectedSessionId(firstSession.session_id);
    }
  }, [selectedSessionId, sessionsData?.sessions]);

  useEffect(() => {
    setOutput('');
    setOffset(0);
  }, [selectedSessionId]);

  useEffect(() => {
    if (accessToken.length === 0 || selectedSessionId === null) return undefined;
    let cancelled = false;
    const poll = async () => {
      const chunk = await fetchPortalAgentOutput(accessToken, tenantSlug, agentId, selectedSessionId, offset);
      if (cancelled) return;
      if (chunk.output.length > 0) {
        setOutput((current) => `${current}${chunk.output}`);
      }
      setOffset(chunk.next_offset);
    };
    void poll().catch(() => undefined);
    const interval = setInterval(() => {
      void poll().catch(() => undefined);
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [accessToken, agentId, offset, selectedSessionId, tenantSlug]);

  async function handleStart(): Promise<void> {
    setError(null);
    try {
      const response = await startPortalAgentTerminal(accessToken, tenantSlug, {
        agent_id: agentId,
        process_label: `${tenantSlug}-portal-shell`,
        objective,
        commands: commandsFromText(commandsText),
      });
      setSelectedSessionId(response.session_id);
      await refreshSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleStop(): Promise<void> {
    if (selectedSessionId === null) return;
    await stopPortalAgentTerminal(accessToken, tenantSlug, agentId, selectedSessionId);
    await refreshSessions();
  }

  async function handleExecuteTool(toolId: string): Promise<void> {
    const result = await executePortalAgentMcpTool(accessToken, tenantSlug, toolId, {
      agent_id: agentId,
      session_id: selectedSessionId,
    });
    setMcpResult(JSON.stringify(result, null, 2));
  }

  if (accessToken.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>IDE Octopus requiere sesión real</CardTitle>
          <CardDescription>El modo demo no ejecuta terminales ni tools MCP.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[260px_1fr_320px]">
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TerminalSquare className="h-4 w-4 text-ops-green" />
            Sesión
          </CardTitle>
          <CardDescription>Plan actual: {plan}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            className="w-full rounded-sm border border-ops-border bg-ops-bg p-2 text-sm text-neutral-100"
            value={agentId}
            onChange={(event) => setAgentId(event.target.value)}
          />
          <textarea
            className="min-h-20 w-full rounded-sm border border-ops-border bg-ops-bg p-3 text-sm text-neutral-100"
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
          />
          <textarea
            className="min-h-36 w-full rounded-sm border border-ops-border bg-ops-bg p-3 font-mono text-xs text-neutral-100"
            value={commandsText}
            onChange={(event) => setCommandsText(event.target.value)}
          />
          <Button className="w-full" onClick={() => void handleStart()}>
            <Play className="mr-2 h-4 w-4" />
            Iniciar
          </Button>
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Terminal tenant-aware</CardTitle>
            <CardDescription>Output incremental por sesión y agente.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void handleStop()} disabled={selectedSessionId === null}>
            <Square className="mr-2 h-4 w-4" />
            Stop
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(sessionsData?.sessions ?? []).map((session) => (
              <button
                key={session.session_id}
                type="button"
                className={`rounded-sm border px-3 py-2 text-left text-xs ${
                  session.session_id === selectedSessionId
                    ? 'border-ops-green text-ops-green'
                    : 'border-ops-border text-neutral-400'
                }`}
                onClick={() => setSelectedSessionId(session.session_id)}
              >
                <div className="font-mono">{session.process_label ?? session.session_id.slice(0, 8)}</div>
                <div className={statusTone(session.status)}>{session.status}</div>
              </button>
            ))}
          </div>
          {selectedSession ? (
            <div className="space-y-3 rounded-sm border border-ops-border bg-ops-bg/60 p-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Objective loop</p>
                <p className="mt-1 text-sm text-neutral-200">
                  {selectedSession.objective ?? 'Sin objective explícito.'}
                </p>
              </div>
              <div className="grid gap-2 text-xs text-neutral-500 sm:grid-cols-4">
                <span>plan: {selectedSession.process_label ?? 'shell'}</span>
                <span>act: {selectedSession.current_command ?? 'idle'}</span>
                <span>verify: {selectedSession.status}</span>
                <span>retry: {selectedSession.retries}</span>
              </div>
              <p className="text-xs text-neutral-500">
                comandos {selectedSession.commands_executed} · pid {selectedSession.pid ?? 'n/a'} · cwd{' '}
                {selectedSession.cwd}
              </p>
            </div>
          ) : null}
          <pre className="min-h-[430px] overflow-auto rounded-sm border border-ops-border bg-black/70 p-4 font-mono text-xs text-ops-green">
            {output || 'Sin output todavía.'}
          </pre>
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlugZap className="h-4 w-4 text-ops-green" />
            MCP permitido
          </CardTitle>
          <CardDescription>Portal solo expone tools policy-gated para el tenant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(mcpCatalog?.tools ?? []).map((tool) => (
            <div key={tool.id} className="rounded-sm border border-ops-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-sm text-neutral-100">{tool.label}</p>
                <span className="text-xs text-ops-green">{tool.mode}</span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">{tool.description}</p>
              <Button className="mt-3 w-full" variant="ghost" size="sm" onClick={() => void handleExecuteTool(tool.id)}>
                Probar tool
              </Button>
            </div>
          ))}
          <pre className="max-h-64 overflow-auto rounded-sm bg-black/50 p-3 text-xs text-neutral-400">
            {mcpResult ?? 'Sin ejecución.'}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
