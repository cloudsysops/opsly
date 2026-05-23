'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import useSWR from 'swr';
import { CheckCircle2, CircleAlert, Download, PackageSearch, ShieldCheck, TerminalSquare } from 'lucide-react';

import { getBaseUrl } from '../../../lib/api-client';

type BinaryStatus = {
  name: string;
  path: string | null;
  installed: boolean;
  version: string | null;
};

type ToolStatus = {
  id: string;
  type: string;
  required: boolean;
  installed: boolean;
  missing: string[];
  binaries: BinaryStatus[];
  app?: {
    app_name: string;
    path: string | null;
    installed: boolean;
    running: boolean;
  };
  install: {
    provider: 'brew' | 'none';
    package: string | null;
    allowed: boolean;
    approval_required: boolean;
  };
};

type ToolsResponse = {
  generated_at: string;
  workspace_root: string;
  tools: ToolStatus[];
  missing_required: string[];
};

type AuditEvent = {
  id: string;
  ts: string;
  actor: string;
  action: string;
  target: string;
  allowed: boolean;
  status: string;
  message?: string;
};

type HistoryResponse = {
  generated_at: string;
  events: AuditEvent[];
};

type InstallPlanResponse = {
  generated_at: string;
  allowed: boolean;
  approval_required: true;
  commands: Array<{ command: string; args: string[] }>;
  message: string;
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
};

export default function LocalRuntimePage() {
  const baseUrl = useMemo(() => getBaseUrl(), []);
  const [planMessage, setPlanMessage] = useState<string | null>(null);
  const { data, error, mutate } = useSWR<ToolsResponse>(
    `${baseUrl}/api/admin/local-runtime/tools`,
    fetcher,
    { refreshInterval: 15000 }
  );
  const { data: history, mutate: mutateHistory } = useSWR<HistoryResponse>(
    `${baseUrl}/api/admin/local-runtime/history?limit=8`,
    fetcher,
    { refreshInterval: 15000 }
  );

  async function createPlan(tool: string) {
    setPlanMessage(null);
    const res = await fetch(`${baseUrl}/api/admin/local-runtime/install-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, actor: 'admin-ui' }),
    });
    const payload = (await res.json()) as InstallPlanResponse & { error?: string };
    if (!res.ok) {
      setPlanMessage(payload.error ?? payload.message ?? 'Install plan denied');
    } else {
      const command = payload.commands
        .map((item) => [item.command, ...item.args].join(' '))
        .join(' && ');
      setPlanMessage(`${tool}: ${payload.message} ${command ? `Command: ${command}` : ''}`);
    }
    await Promise.all([mutate(), mutateHistory()]);
  }

  const tools = data?.tools ?? [];
  const installed = tools.filter((tool) => tool.installed).length;
  const missing = tools.length - installed;
  const missingRequired = data?.missing_required.length ?? 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-ops-magenta">Mission Control</p>
            <h1 className="mt-2 text-3xl font-bold">Local Runtime</h1>
            <p className="mt-2 max-w-3xl text-sm text-neutral-400">
              Permission-based discovery for developer apps, binaries, Docker tooling, and approved install plans.
            </p>
          </div>
          <button
            onClick={() => mutate()}
            className="rounded-md border border-ops-cyan/40 px-4 py-2 text-sm text-ops-cyan hover:bg-ops-cyan/10"
          >
            Refresh
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <SummaryCard icon={<PackageSearch className="h-5 w-5" />} label="Registered" value={tools.length} />
          <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Installed" value={installed} />
          <SummaryCard icon={<CircleAlert className="h-5 w-5" />} label="Missing" value={missing} />
          <SummaryCard icon={<ShieldCheck className="h-5 w-5" />} label="Required Missing" value={missingRequired} />
        </section>

        {error ? (
          <div className="rounded-md border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200">
            Failed to load local runtime. Check API auth or local environment.
          </div>
        ) : null}

        {planMessage ? (
          <div className="rounded-md border border-ops-cyan/30 bg-ops-cyan/10 p-4 text-sm text-ops-cyan">
            {planMessage}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950/70">
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1.2fr_140px] border-b border-neutral-800 px-4 py-3 text-xs uppercase tracking-[0.16em] text-neutral-500">
            <div>Tool</div>
            <div>Status</div>
            <div>Version</div>
            <div>Install</div>
            <div>Action</div>
          </div>
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="grid grid-cols-[1.2fr_1fr_1fr_1.2fr_140px] items-center border-b border-neutral-900 px-4 py-3 text-sm last:border-b-0"
            >
              <div>
                <div className="font-medium text-white">{tool.id}</div>
                <div className="text-xs text-neutral-500">{tool.type}</div>
              </div>
              <div className={tool.installed ? 'text-emerald-300' : 'text-amber-300'}>
                {tool.installed ? 'installed' : `missing ${tool.missing.join(', ')}`}
              </div>
              <div className="truncate font-mono text-xs text-neutral-300">
                {tool.binaries.find((binary) => binary.version)?.version ?? (tool.app?.running ? 'app running' : '-')}
              </div>
              <div className="text-xs text-neutral-400">
                {tool.install.package ? `${tool.install.provider}: ${tool.install.package}` : 'none'}
                {tool.install.allowed ? <span className="ml-2 text-emerald-300">allowlisted</span> : null}
              </div>
              <div>
                <button
                  disabled={!tool.install.allowed}
                  onClick={() => createPlan(tool.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download className="h-3 w-3" />
                  Plan
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_420px]">
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/70 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <TerminalSquare className="h-5 w-5 text-ops-cyan" />
              Workspace
            </h2>
            <div className="font-mono text-sm text-neutral-300">{data?.workspace_root ?? '~/opsly-workspace/opsly'}</div>
            <p className="mt-3 text-sm text-neutral-500">
              Installs are not executed here. This MVP creates auditable plans only; execution needs human approval.
            </p>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-950/70 p-4">
            <h2 className="mb-3 text-lg font-semibold">Automation History</h2>
            <div className="space-y-3">
              {(history?.events ?? []).map((event) => (
                <div key={event.id} className="border-b border-neutral-900 pb-2 text-xs last:border-b-0">
                  <div className="flex justify-between gap-2 text-neutral-300">
                    <span>{event.action}</span>
                    <span className={event.allowed ? 'text-emerald-300' : 'text-red-300'}>{event.status}</span>
                  </div>
                  <div className="mt-1 text-neutral-500">{event.target}</div>
                </div>
              ))}
              {(history?.events ?? []).length === 0 ? (
                <div className="text-sm text-neutral-500">No automation events yet.</div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/70 p-4">
      <div className="flex items-center justify-between text-neutral-400">
        <span className="text-sm">{label}</span>
        <span className="text-ops-cyan">{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
    </div>
  );
}
