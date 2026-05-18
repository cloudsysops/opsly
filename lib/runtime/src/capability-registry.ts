import type { DetectorDeps, RuntimeProfile } from './environment-detector.js';
import { createDefaultDeps, detectEnvironment } from './environment-detector.js';

export type CapabilityCategory = 'opsly' | 'runtime' | 'editor' | 'agent' | 'coordination';
export type CapabilityPresence = 'available' | 'unavailable' | 'unknown';

export interface RuntimeCapability {
  id: string;
  label: string;
  category: CapabilityCategory;
  presence: CapabilityPresence;
  recommended: boolean;
  reason: string;
  evidence: string[];
}

export interface CapabilityRegistry {
  generatedAt: string;
  summary: string;
  machine: {
    os: RuntimeProfile['system']['os'];
    cpuCores: number;
    ramGb: number;
    gpuAvailable: boolean;
    topologyType: RuntimeProfile['recommendation']['topologyType'];
    dockerEngine: RuntimeProfile['recommendation']['dockerEngine'];
    maxLocalWorkers: number;
    cloudRole: RuntimeProfile['recommendation']['suggestedCloudRole'];
  };
  capabilities: RuntimeCapability[];
  detectedEditors: string[];
  detectedAgents: string[];
}

interface CapabilityDescriptor {
  id: string;
  label: string;
  category: CapabilityCategory;
  command?: string;
  presence?: CapabilityPresence;
  recommended?: (profile: RuntimeProfile) => boolean;
  availableReason: string;
  unavailableReason: string;
  evidence: string[];
}

function makeCapability(
  descriptor: CapabilityDescriptor,
  presence: CapabilityPresence,
  recommended: boolean
): RuntimeCapability {
  return {
    id: descriptor.id,
    label: descriptor.label,
    category: descriptor.category,
    presence,
    recommended,
    reason:
      presence === 'available'
        ? descriptor.availableReason
        : presence === 'unavailable'
          ? descriptor.unavailableReason
          : 'Presence cannot be verified from CLI context',
    evidence: descriptor.evidence,
  };
}

async function detectCommandPresence(
  deps: DetectorDeps,
  command?: string
): Promise<CapabilityPresence> {
  if (!command) {
    return 'unknown';
  }
  return (await deps.commandExists(command)) ? 'available' : 'unavailable';
}

function summaryForCapabilities(profile: RuntimeProfile, capabilities: RuntimeCapability[]): string {
  const available = capabilities.filter((cap) => cap.presence === 'available').length;
  const editors = capabilities.filter(
    (cap) => cap.category === 'editor' && cap.presence === 'available'
  ).length;
  const agents = capabilities.filter(
    (cap) => cap.category === 'agent' && cap.presence === 'available'
  ).length;

  return [
    `${profile.recommendation.topologyType} mode`,
    `${profile.recommendation.dockerEngine} engine`,
    `${profile.recommendation.maxLocalWorkers} local worker${profile.recommendation.maxLocalWorkers === 1 ? '' : 's'}`,
    `${available} capabilities`,
    `${editors} editor${editors === 1 ? '' : 's'}`,
    `${agents} agent tool${agents === 1 ? '' : 's'}`,
  ].join(' · ');
}

export async function detectCapabilityRegistry(
  deps: DetectorDeps = createDefaultDeps(),
  profile?: RuntimeProfile
): Promise<CapabilityRegistry> {
  const resolvedProfile = profile ?? (await detectEnvironment(deps));
  const { system, recommendation } = resolvedProfile;

  const [
    tmuxPresence,
    dockerPresence,
    colimaPresence,
    podmanPresence,
    ollamaPresence,
    redisPresence,
    ghPresence,
    gwsPresence,
    claudePresence,
    codexPresence,
    cursorPresence,
    codePresence,
    opencodePresence,
    openhandsPresence,
  ] = await Promise.all([
    detectCommandPresence(deps, 'tmux'),
    detectCommandPresence(deps, 'docker'),
    detectCommandPresence(deps, 'colima'),
    detectCommandPresence(deps, 'podman'),
    detectCommandPresence(deps, 'ollama'),
    detectCommandPresence(deps, 'redis-cli'),
    detectCommandPresence(deps, 'gh'),
    detectCommandPresence(deps, 'gws'),
    detectCommandPresence(deps, 'claude'),
    detectCommandPresence(deps, 'codex'),
    detectCommandPresence(deps, 'cursor'),
    detectCommandPresence(deps, 'code'),
    detectCommandPresence(deps, 'opencode'),
    detectCommandPresence(deps, 'openhands'),
  ]);

  const capabilities: RuntimeCapability[] = [
    makeCapability(
      {
        id: 'opsly-orchestrator',
        label: 'Opsly Orchestrator',
        category: 'opsly',
        availableReason: 'Orchestrator control plane is running inside Opsly',
        unavailableReason: 'Orchestrator control plane unavailable',
        evidence: ['internal:/health', 'internal:/runtime/*'],
      },
      'available',
      true
    ),
    makeCapability(
      {
        id: 'opsly-session-manager',
        label: 'Session Manager',
        category: 'opsly',
        availableReason: 'tmux-backed session runtime and checkpointing are wired',
        unavailableReason: 'Session manager unavailable',
        evidence: ['session-manager', 'tmux'],
      },
      'available',
      true
    ),
    makeCapability(
      {
        id: 'opsly-mcp',
        label: 'Opsly MCP',
        category: 'opsly',
        availableReason: 'OpenClaw / MCP bridge is part of the control plane',
        unavailableReason: 'MCP bridge unavailable',
        evidence: ['apps/mcp', 'OpenClaw'],
      },
      'available',
      true
    ),
    makeCapability(
      {
        id: 'opsly-branch-governance',
        label: 'Git Governance',
        category: 'coordination',
        availableReason: 'Branch registry and merge advisor are active',
        unavailableReason: 'Branch governance unavailable',
        evidence: ['git-branch-orchestrator'],
      },
      'available',
      true
    ),
    makeCapability(
      {
        id: 'opsly-mission-control',
        label: 'Mission Control',
        category: 'coordination',
        availableReason: 'Mission Control pages and chat are wired',
        unavailableReason: 'Mission Control unavailable',
        evidence: ['/mission-control', '/mission-control/chat'],
      },
      'available',
      true
    ),
    makeCapability(
      {
        id: 'tmux',
        label: 'tmux',
        category: 'runtime',
        availableReason: 'Canonical local session runtime',
        unavailableReason: 'tmux not installed',
        evidence: ['command:tmux'],
      },
      tmuxPresence,
      true
    ),
    makeCapability(
      {
        id: 'docker',
        label: 'Docker',
        category: 'runtime',
        availableReason: 'Container runtime available',
        unavailableReason: 'Docker not installed',
        evidence: ['command:docker'],
      },
      dockerPresence,
      recommendation.dockerEngine === 'docker-desktop'
    ),
    makeCapability(
      {
        id: 'colima',
        label: 'Colima',
        category: 'runtime',
        availableReason: 'Lightweight macOS container engine available',
        unavailableReason: 'Colima not installed',
        evidence: ['command:colima'],
      },
      colimaPresence,
      system.os === 'macos' && colimaPresence === 'available'
    ),
    makeCapability(
      {
        id: 'podman',
        label: 'Podman',
        category: 'runtime',
        availableReason: 'Rootless container runtime available',
        unavailableReason: 'Podman not installed',
        evidence: ['command:podman'],
      },
      podmanPresence,
      system.os === 'linux' && podmanPresence === 'available'
    ),
    makeCapability(
      {
        id: 'ollama',
        label: 'Ollama',
        category: 'agent',
        availableReason: 'Local LLM worker available',
        unavailableReason: 'Ollama not installed',
        evidence: ['command:ollama'],
      },
      ollamaPresence,
      recommendation.useLocalOllama
    ),
    makeCapability(
      {
        id: 'gh',
        label: 'GitHub CLI',
        category: 'coordination',
        availableReason: 'GitHub CLI available for PR workflows',
        unavailableReason: 'GitHub CLI not installed',
        evidence: ['command:gh'],
      },
      ghPresence,
      ghPresence === 'available'
    ),
    makeCapability(
      {
        id: 'gws',
        label: 'gws CLI',
        category: 'coordination',
        availableReason: 'Google Workspace CLI available',
        unavailableReason: 'gws CLI not installed',
        evidence: ['command:gws'],
      },
      gwsPresence,
      gwsPresence === 'available'
    ),
    makeCapability(
      {
        id: 'claude',
        label: 'Claude Code',
        category: 'agent',
        availableReason: 'Claude CLI detected',
        unavailableReason: 'Claude CLI not installed',
        evidence: ['command:claude'],
      },
      claudePresence,
      claudePresence === 'available'
    ),
    makeCapability(
      {
        id: 'codex',
        label: 'Codex CLI',
        category: 'agent',
        availableReason: 'Codex CLI detected',
        unavailableReason: 'Codex CLI not installed',
        evidence: ['command:codex'],
      },
      codexPresence,
      codexPresence === 'available'
    ),
    makeCapability(
      {
        id: 'cursor',
        label: 'Cursor',
        category: 'editor',
        availableReason: 'Cursor binary detected',
        unavailableReason: 'Cursor binary not installed',
        evidence: ['command:cursor'],
      },
      cursorPresence,
      cursorPresence === 'available'
    ),
    makeCapability(
      {
        id: 'vscode',
        label: 'VS Code',
        category: 'editor',
        availableReason: 'VS Code binary detected',
        unavailableReason: 'VS Code binary not installed',
        evidence: ['command:code'],
      },
      codePresence,
      codePresence === 'available'
    ),
    makeCapability(
      {
        id: 'opencode',
        label: 'OpenCode',
        category: 'agent',
        availableReason: 'OpenCode binary detected',
        unavailableReason: 'OpenCode not installed',
        evidence: ['command:opencode'],
      },
      opencodePresence,
      opencodePresence === 'available'
    ),
    makeCapability(
      {
        id: 'openhands',
        label: 'OpenHands',
        category: 'agent',
        availableReason: 'OpenHands binary detected',
        unavailableReason: 'OpenHands not installed',
        evidence: ['command:openhands'],
      },
      openhandsPresence,
      openhandsPresence === 'available'
    ),
    makeCapability(
      {
        id: 'copilot',
        label: 'GitHub Copilot',
        category: 'editor',
        availableReason: 'Copilot extension is editor-scoped and not CLI-detectable',
        unavailableReason: 'Copilot extension cannot be verified from CLI',
        evidence: ['editor-extension'],
      },
      'unknown',
      false
    ),
  ];

  const detectedEditors = capabilities
    .filter((cap) => cap.category === 'editor' && cap.presence === 'available')
    .map((cap) => cap.label);
  const detectedAgents = capabilities
    .filter((cap) => cap.category === 'agent' && cap.presence === 'available')
    .map((cap) => cap.label);

  return {
    generatedAt: new Date().toISOString(),
    summary: summaryForCapabilities(resolvedProfile, capabilities),
    machine: {
      os: system.os,
      cpuCores: system.cpuCores,
      ramGb: system.ramGb,
      gpuAvailable: system.gpuAvailable,
      topologyType: recommendation.topologyType,
      dockerEngine: recommendation.dockerEngine,
      maxLocalWorkers: recommendation.maxLocalWorkers,
      cloudRole: recommendation.suggestedCloudRole,
    },
    capabilities,
    detectedEditors,
    detectedAgents,
  };
}
