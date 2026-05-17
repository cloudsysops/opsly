import { execSync } from 'child_process';
import { hostname, platform } from 'os';

interface AgentCapability {
  tool_type: string;
  name: string;
  installed: boolean;
  path: string | null;
  version: string | null;
  capabilities: string[];
  health: string;
  last_check: string;
}

interface DetectionResult {
  detected_at: string;
  hostname: string;
  platform: string;
  agents: AgentCapability[];
  summary: {
    total: number;
    installed: number;
    available: string[];
    unavailable: string[];
  };
}

const AGENTS = [
  {
    tool_type: 'cursor',
    name: 'Cursor',
    command: 'cursor',
    capabilities: ['code', 'edit', 'chat'],
  },
  {
    tool_type: 'claude',
    name: 'Claude Code',
    command: 'claude',
    capabilities: ['code', 'edit', 'chat', 'research'],
  },
  {
    tool_type: 'codex',
    name: 'Codex CLI',
    command: 'codex',
    capabilities: ['code', 'edit', 'terminal'],
  },
  {
    tool_type: 'copilot',
    name: 'GitHub Copilot',
    command: 'copilot',
    capabilities: ['code', 'edit', 'chat'],
  },
  {
    tool_type: 'opencode',
    name: 'OpenCode',
    command: 'opencode',
    capabilities: ['code', 'edit', 'chat'],
  },
  { tool_type: 'vscode', name: 'VSCode', command: 'code', capabilities: ['code', 'edit', 'debug'] },
  { tool_type: 'aider', name: 'Aider', command: 'aider', capabilities: ['code', 'git', 'edit'] },
  { tool_type: 'goose', name: 'Goose', command: 'goose', capabilities: ['agent', 'general'] },
  { tool_type: 'tmux', name: 'Tmux', command: 'tmux', capabilities: ['session', 'multiplexer'] },
  {
    tool_type: 'docker',
    name: 'Docker',
    command: 'docker',
    capabilities: ['container', 'runtime'],
  },
  { tool_type: 'git', name: 'Git', command: 'git', capabilities: ['vcs', 'branch', 'workflow'] },
];

function detectAgent(command: string): { path: string | null; version: string | null } {
  try {
    const path = execSync(`which ${command}`, { encoding: 'utf8', timeout: 2000 }).trim();
    if (!path) return { path: null, version: null };

    let version: string | null = null;
    try {
      version = execSync(`${command} --version 2>/dev/null`, { encoding: 'utf8', timeout: 1000 })
        .trim()
        .split('\n')[0];
      if (!version || version.length > 100) version = null;
    } catch {
      version = null;
    }

    return { path, version };
  } catch {
    return { path: null, version: null };
  }
}

function main() {
  const results: AgentCapability[] = [];
  const available: string[] = [];
  const unavailable: string[] = [];

  for (const agent of AGENTS) {
    const { path, version } = detectAgent(agent.command);
    const installed = !!path;

    results.push({
      tool_type: agent.tool_type,
      name: agent.name,
      installed,
      path,
      version,
      capabilities: agent.capabilities,
      health: installed ? 'ready' : 'not_installed',
      last_check: new Date().toISOString(),
    });

    if (installed) {
      available.push(agent.tool_type);
    } else {
      unavailable.push(agent.tool_type);
    }
  }

  const output: DetectionResult = {
    detected_at: new Date().toISOString(),
    hostname: hostname(),
    platform: platform(),
    agents: results,
    summary: {
      total: AGENTS.length,
      installed: available.length,
      available,
      unavailable,
    },
  };

  console.log(JSON.stringify(output, null, 2));
}

main();
