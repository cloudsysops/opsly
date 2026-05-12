/**
 * LocalWorkerPool: Manage parallel execution of multiple agents
 * Coordinates: Cursor (5001), Claude (5002), Copilot (5003), OpenCode (5004)
 */

export interface AgentServiceConfig {
  name: string;
  role: string;
  endpoint: string;
  port: number;
  type: 'http' | 'mcp' | 'subprocess';
  timeout: number;
  enabled: boolean;
}

export interface ParallelExecutionRequest {
  prompt_content: string;
  prompt_path: string;
  job_id: string;
  agent_roles?: string[]; // Specific agents, or all if undefined
  timeout?: number;
  max_concurrent?: number;
}

export interface AgentExecutionResult {
  agent_name: string;
  agent_role: string;
  status: 'success' | 'failed' | 'timeout';
  response?: string;
  error?: string;
  execution_time_ms: number;
}

export interface ParallelExecutionResults {
  job_id: string;
  total_agents: number;
  successful: number;
  failed: number;
  results: AgentExecutionResult[];
  completed_at: string;
}

export class LocalWorkerPool {
  private agents: Map<string, AgentServiceConfig> = new Map();
  private defaultMaxConcurrent: number = 4;

  constructor() {
    this.initializeAgents();
  }

  /**
   * Initialize available agent services from env configuration
   */
  private initializeAgents(): void {
    const agentConfigs: AgentServiceConfig[] = [
      {
        name: 'cursor',
        role: 'executor',
        endpoint: process.env.CURSOR_AGENT_URL || 'http://localhost:5001',
        port: 5001,
        type: 'http',
        timeout: 60000,
        enabled: true,
      },
      {
        name: 'claude',
        role: 'analyzer',
        endpoint: process.env.CLAUDE_AGENT_URL || 'http://localhost:5002',
        port: 5002,
        type: 'http',
        timeout: 45000,
        enabled: !!process.env.CLAUDE_AGENT_URL,
      },
      {
        name: 'copilot',
        role: 'validator',
        endpoint: process.env.COPILOT_AGENT_URL || 'http://localhost:5003',
        port: 5003,
        type: 'http',
        timeout: 30000,
        enabled: !!process.env.COPILOT_AGENT_URL,
      },
      {
        name: 'opencode',
        role: 'refiner',
        endpoint: process.env.OPENCODE_AGENT_URL || 'http://localhost:5004',
        port: 5004,
        type: 'http',
        timeout: 40000,
        enabled: !!process.env.OPENCODE_AGENT_URL,
      },
    ];

    agentConfigs.forEach((config) => {
      this.agents.set(config.name, config);
    });

    console.log(
      `[LocalWorkerPool] Initialized with ${Array.from(this.agents.values()).filter((a) => a.enabled).length} agents`
    );
  }

  /**
   * Get agent config by name
   */
  getAgent(name: string): AgentServiceConfig | undefined {
    return this.agents.get(name);
  }

  /**
   * Get all enabled agents
   */
  getEnabledAgents(): AgentServiceConfig[] {
    return Array.from(this.agents.values()).filter((a) => a.enabled);
  }

  /**
   * Get agents by role
   */
  getAgentsByRole(role: string): AgentServiceConfig[] {
    return Array.from(this.agents.values()).filter((a) => a.enabled && a.role === role);
  }

  /**
   * Execute request in parallel across multiple agents
   */
  async executeParallel(request: ParallelExecutionRequest): Promise<ParallelExecutionResults> {
    const startTime = Date.now();

    // Determine which agents to execute
    let agentsToUse = this.getEnabledAgents();
    if (request.agent_roles && request.agent_roles.length > 0) {
      agentsToUse = agentsToUse.filter((a) => request.agent_roles!.includes(a.role));
    }

    const maxConcurrent = request.max_concurrent || this.defaultMaxConcurrent;
    const timeout = request.timeout || 60000;

    console.log(
      `[LocalWorkerPool] Executing ${request.job_id} on ${agentsToUse.length} agents (max concurrent: ${maxConcurrent})`
    );

    // Execute in batches to respect concurrency limit
    const results: AgentExecutionResult[] = [];
    for (let i = 0; i < agentsToUse.length; i += maxConcurrent) {
      const batch = agentsToUse.slice(i, i + maxConcurrent);
      const batchPromises = batch.map((agent) => this.executeOnAgent(agent, request, timeout));

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const successful = results.filter((r) => r.status === 'success').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    console.log(
      `[LocalWorkerPool] Completed ${request.job_id}: ${successful} succeeded, ${failed} failed (${Date.now() - startTime}ms)`
    );

    return {
      job_id: request.job_id,
      total_agents: agentsToUse.length,
      successful,
      failed,
      results,
      completed_at: new Date().toISOString(),
    };
  }

  /**
   * Execute on single agent
   */
  private async executeOnAgent(
    agent: AgentServiceConfig,
    request: ParallelExecutionRequest,
    timeout: number
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    try {
      console.log(`[LocalWorkerPool] Executing ${request.job_id} on ${agent.name}...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), Math.min(agent.timeout, timeout));

      const response = await fetch(`${agent.endpoint}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_content: request.prompt_content,
          prompt_path: request.prompt_path,
          job_id: request.job_id,
          agent_role: agent.role,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { response?: string; error?: string };

      return {
        agent_name: agent.name,
        agent_role: agent.role,
        status: 'success',
        response: data.response,
        execution_time_ms: Date.now() - startTime,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      const executionTime = Date.now() - startTime;
      const status = executionTime > Math.min(agent.timeout, timeout) ? 'timeout' : 'failed';

      return {
        agent_name: agent.name,
        agent_role: agent.role,
        status: status as 'failed' | 'timeout',
        error: errorMsg,
        execution_time_ms: executionTime,
      };
    }
  }

  /**
   * Get statistics on agent availability
   */
  getPoolStats(): {
    total_agents: number;
    enabled_agents: number;
    agents_by_role: Record<string, number>;
  } {
    const allAgents = Array.from(this.agents.values());
    const enabledAgents = allAgents.filter((a) => a.enabled);

    const byRole: Record<string, number> = {};
    enabledAgents.forEach((a) => {
      byRole[a.role] = (byRole[a.role] || 0) + 1;
    });

    return {
      total_agents: allAgents.length,
      enabled_agents: enabledAgents.length,
      agents_by_role: byRole,
    };
  }

  /**
   * Check agent health
   */
  async checkAgentHealth(agentName: string): Promise<boolean> {
    const agent = this.getAgent(agentName);
    if (!agent || !agent.enabled) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${agent.endpoint}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check health of all agents
   */
  async checkPoolHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    const enabledAgents = this.getEnabledAgents();
    const healthChecks = enabledAgents.map(async (agent) => ({
      name: agent.name,
      healthy: await this.checkAgentHealth(agent.name),
    }));

    const results = await Promise.all(healthChecks);
    results.forEach(({ name, healthy }) => {
      health[name] = healthy;
    });

    return health;
  }
}
