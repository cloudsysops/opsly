'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Play, PlugZap, Square, TerminalSquare } from 'lucide-react';
import {
  executeAgentIdeMcpTool,
  getAgentIdeMcpTools,
  listAgentIdeTerminalSessions,
  readAgentIdeTerminalOutput,
  startAgentIdeTerminal,
  stopAgentIdeTerminalSession,
  type AgentIdeTerminalSession,
} from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const DEFAULT_COMMANDS = 'pwd\nnode --version';

function statusTone(status: AgentIdeTerminalSession['status']): string {
  if (status === 'running') return 'text-ops-cyan';
  if (status === 'completed') return 'text-ops-green';
  if (status === 'failed') return 'text-ops-red';
  return 'text-ops-gray';
}

function commandsFromText(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default function OpenClawIdePage() {
  const [agentId, setAgentId] = useState('cursor');
  const [tenantSlug, setTenantSlug] = useState('opsly-internal');
  const [processLabel, setProcessLabel] = useState('diagnostic-shell');
  const [objective, setObjective] = useState('Validar entorno del agente desde IDE Octopus');
  const [commandsText, setCommandsText] = useState(DEFAULT_COMMANDS);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [output, setOutput] = useState('');
  const [outputOffset, setOutputOffset] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mcpResult, setMcpResult] = useState<string | null>(null);

  const { data: sessionsData, mutate: refreshSessions } = useSWR(
    ['agent-ide-sessions', agentId],
    () => listAgentIdeTerminalSessions(agentId),
    { refreshInterval: 3000 }
  );
  const { data: mcpCatalog } = useSWR(['agent-ide-mcp-tools'], () => getAgentIdeMcpTools());

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
    setOutputOffset(0);
  }, [selectedSessionId]);

  useEffect(() => {
    if (selectedSessionId === null) return undefined;
    let cancelled = false;
    const poll = async () => {
      const chunk = await readAgentIdeTerminalOutput(agentId, selectedSessionId, outputOffset);
      if (cancelled) return;
      if (chunk.output.length > 0) {
        setOutput((current) => `${current}${chunk.output}`);
      }
      setOutputOffset(chunk.next_offset);
    };
    void poll().catch(() => undefined);
    const interval = setInterval(() => {
      void poll().catch(() => undefined);
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [agentId, outputOffset, selectedSessionId]);

  async function handleStart(): Promise<void> {
    setSubmitError(null);
    try {
      const response = await startAgentIdeTerminal({
        agent_id: agentId,
        tenant_slug: tenantSlug,
        process_label: processLabel,
        objective,
        commands: commandsFromText(commandsText),
      });
      setSelectedSessionId(response.session_id);
      await refreshSessions();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleStop(): Promise<void> {
    if (!selectedSessionId) return;
    await stopAgentIdeTerminalSession(agentId, selectedSessionId);
    await refreshSessions();
  }

  async function handleExecuteTool(toolId: string): Promise<void> {
    const result = await executeAgentIdeMcpTool(toolId, { agent_id: agentId, session_id: selectedSessionId });
    setMcpResult(JSON.stringify(result, null, 2));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-ops-magenta">OpenClaw IDE</p>
          <h1 className="font-display text-2xl text-ops-cyan">IDE Octopus para Agentes</h1>
          <p className="mt-1 max-w-3xl text-sm text-ops-gray">
            Consola admin para iniciar sesiones terminal por agente, leer output incremental y probar tools MCP
            bajo policy.
          </p>
        </div>
        <Badge variant="blue">backend BFF + orchestrator</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TerminalSquare className="h-4 w-4 text-ops-cyan" />
              Agente / sesión
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={agentId} onChange={(event) => setAgentId(event.target.value)} placeholder="agent_id" />
            <Input
              value={tenantSlug}
              onChange={(event) => setTenantSlug(event.target.value)}
              placeholder="tenant_slug"
            />
            <Input
              value={processLabel}
              onChange={(event) => setProcessLabel(event.target.value)}
              placeholder="process_label"
            />
            <textarea
              className="min-h-20 w-full rounded-md border border-ops-cyan/20 bg-black/40 p-3 text-sm text-neutral-100"
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
            />
            <textarea
              className="min-h-32 w-full rounded-md border border-ops-cyan/20 bg-black/40 p-3 font-mono text-sm text-neutral-100"
              value={commandsText}
              onChange={(event) => setCommandsText(event.target.value)}
            />
            <Button className="w-full" onClick={() => void handleStart()}>
              <Play className="mr-2 h-4 w-4" />
              Iniciar sesión
            </Button>
            {submitError ? <p className="text-xs text-ops-red">{submitError}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm">Terminal</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => void handleStop()} disabled={!selectedSessionId}>
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
                  className={`rounded-lg border px-3 py-2 text-left text-xs ${
                    session.session_id === selectedSessionId
                      ? 'border-ops-cyan text-ops-cyan'
                      : 'border-white/10 text-ops-gray'
                  }`}
                  onClick={() => setSelectedSessionId(session.session_id)}
                >
                  <div className="font-mono">{session.process_label ?? session.session_id.slice(0, 8)}</div>
                  <div className={statusTone(session.status)}>{session.status}</div>
                </button>
              ))}
            </div>
            {selectedSession ? (
              <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-ops-gray">Objective loop</p>
                  <p className="mt-1 text-sm text-neutral-200">
                    {selectedSession.objective ?? 'Sin objective explícito.'}
                  </p>
                </div>
                <div className="grid gap-2 text-xs text-ops-gray sm:grid-cols-4">
                  <span>plan: {selectedSession.process_label ?? 'shell'}</span>
                  <span>act: {selectedSession.current_command ?? 'idle'}</span>
                  <span>verify: {selectedSession.status}</span>
                  <span>retry: {selectedSession.retries}</span>
                </div>
                <div className="grid gap-2 text-xs text-ops-gray sm:grid-cols-3">
                  <span>cmds: {selectedSession.commands_executed}</span>
                  <span>pid: {selectedSession.pid ?? 'n/a'}</span>
                  <span>exit: {selectedSession.exit_code ?? 'n/a'}</span>
                </div>
              </div>
            ) : null}
            <pre className="min-h-[460px] overflow-auto rounded-xl border border-ops-cyan/20 bg-black/70 p-4 font-mono text-xs text-ops-green">
              {output || 'Sin output todavía. Inicia una sesión o selecciona una existente.'}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <PlugZap className="h-4 w-4 text-ops-magenta" />
              MCP policy panel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(mcpCatalog?.tools ?? []).map((tool) => (
              <div key={tool.id} className="rounded-xl border border-white/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-sm text-neutral-100">{tool.label}</p>
                  <Badge variant={tool.mode === 'action' ? 'yellow' : 'green'}>{tool.mode}</Badge>
                </div>
                <p className="mt-1 text-xs text-ops-gray">{tool.description}</p>
                <Button className="mt-3 w-full" variant="ghost" size="sm" onClick={() => void handleExecuteTool(tool.id)}>
                  Ejecutar policy check
                </Button>
              </div>
            ))}
            <pre className="max-h-64 overflow-auto rounded-xl bg-black/50 p-3 text-xs text-ops-gray">
              {mcpResult ?? 'Sin ejecución MCP.'}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
