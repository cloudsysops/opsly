/**
 * Agent Registry
 * Manages registration, discovery, and lifecycle of agents
 */

import type { Agent, AgentType } from '../types';
import { ClaudeRemoteAgent } from '../agents/claude-remote';
import { CursorLocalAgent } from '../agents/cursor-local';
import { CodexAgent } from '../agents/codex';
import { OpenCodeAgent } from '../agents/opencode';

export interface AgentRegistryEntry {
  id: string;
  type: AgentType;
  agent: Agent;
  enabled: boolean;
  maxConcurrent: number;
  costPerTask: number;
  installed: boolean;
  lastHealthCheck?: Date;
}

export class AgentRegistry {
  private agents: Map<string, AgentRegistryEntry> = new Map();
  private registryConfig: Map<string, Record<string, unknown>> = new Map();

  constructor() {
    this.registerDefaultAgents();
  }

  /**
   * Register default built-in agents
   */
  private registerDefaultAgents(): void {
    this.registerAgent(new ClaudeRemoteAgent(), true, {
      installScript: 'npm install @intcloudsysops/claude-code-remote',
    });

    this.registerAgent(new CursorLocalAgent(), true, {
      installScript: 'curl -o .cursor-auto-work.sh https://...',
    });

    this.registerAgent(new CodexAgent(), false, {
      installScript: 'export CODEX_API_KEY=...',
    });

    this.registerAgent(new OpenCodeAgent(), false, {
      installScript: 'docker run -p 8000:8000 starcoder:latest',
    });
  }

  /**
   * Register an agent
   */
  registerAgent(agent: Agent, enabled = true, config: Record<string, unknown> = {}): void {
    const entry: AgentRegistryEntry = {
      id: agent.id,
      type: agent.type,
      agent,
      enabled,
      maxConcurrent: agent.maxConcurrent || 1,
      costPerTask: agent.costPerTask || 0,
      installed: this.checkInstalled(agent.id),
      lastHealthCheck: new Date(),
    };

    this.agents.set(agent.id, entry);
    this.registryConfig.set(agent.id, config);

    console.log(`[AgentRegistry] Registered agent: ${agent.id} (${agent.type})`);
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | null {
    const entry = this.agents.get(agentId);
    return entry ? entry.agent : null;
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values()).map(entry => entry.agent);
  }

  /**
   * Get all enabled agents
   */
  getEnabledAgents(): Agent[] {
    return Array.from(this.agents.values())
      .filter(entry => entry.enabled && entry.installed)
      .map(entry => entry.agent);
  }

  /**
   * Check if agent is available
   */
  isAgentAvailable(agentId: string): boolean {
    const entry = this.agents.get(agentId);
    return !!entry && entry.enabled && entry.installed && entry.agent.isAvailable();
  }

  /**
   * Get agent registry entry
   */
  getEntry(agentId: string): AgentRegistryEntry | null {
    return this.agents.get(agentId) || null;
  }

  /**
   * Get all entries
   */
  getEntries(): AgentRegistryEntry[] {
    return Array.from(this.agents.values());
  }

  /**
   * Enable agent
   */
  enableAgent(agentId: string): void {
    const entry = this.agents.get(agentId);
    if (entry) {
      entry.enabled = true;
    }
  }

  /**
   * Disable agent
   */
  disableAgent(agentId: string): void {
    const entry = this.agents.get(agentId);
    if (entry) {
      entry.enabled = false;
    }
  }

  /**
   * Check agent health
   */
  async checkHealth(agentId: string): Promise<boolean> {
    const entry = this.agents.get(agentId);
    if (!entry) return false;

    try {
      const available = entry.agent.isAvailable();
      entry.lastHealthCheck = new Date();
      return available;
    } catch (error) {
      console.error(`Health check failed for ${agentId}:`, error);
      return false;
    }
  }

  /**
   * Get installation instruction for agent
   */
  getInstallInstructions(agentId: string): string | null {
    const config = this.registryConfig.get(agentId);
    return (config?.installScript as string) || null;
  }

  /**
   * Check if agent is installed (stub - implement based on your needs)
   */
  private checkInstalled(agentId: string): boolean {
    switch (agentId) {
      case 'claude_remote':
        return true; // Usually always available
      case 'cursor_local':
        return true; // Usually available on local
      case 'codex':
        return !!process.env.CODEX_API_KEY;
      case 'opencode':
        return !!process.env.OPENCODE_MODEL_URL;
      default:
        return false;
    }
  }

  /**
   * Get status summary
   */
  getStatus(): {
    total: number;
    enabled: number;
    installed: number;
    available: number;
    agents: Array<{
      id: string;
      type: string;
      enabled: boolean;
      installed: boolean;
      available: boolean;
      lastHealthCheck?: Date;
    }>;
  } {
    const entries = this.getEntries();
    const statuses = entries.map(entry => ({
      id: entry.id,
      type: entry.type,
      enabled: entry.enabled,
      installed: entry.installed,
      available: entry.agent.isAvailable(),
      lastHealthCheck: entry.lastHealthCheck,
    }));

    return {
      total: entries.length,
      enabled: statuses.filter(s => s.enabled).length,
      installed: statuses.filter(s => s.installed).length,
      available: statuses.filter(s => s.available).length,
      agents: statuses,
    };
  }
}

export default AgentRegistry;
