/**
 * Super Orchestrator Bridge - Conecta Python scripts con TypeScript orchestrator
 * 
 * Provee una capa de abstracción para usar los scripts Python:
 * - provider_selector.py
 * - prompt_controller.py
 * - performance_tracker.py
 * - auto_evolution.py
 * - agent_pool_manager.py
 * - health_monitor.py
 * - cost_optimizer.py
 * - idea_generator.py
 * - git_automation.py
 * - n8n_trigger.py
 */

import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import { existsSync } from 'fs';
import { resolve, join } from 'path';

interface SuperOrchestratorConfig {
  pythonPath: string;
  scriptsDir: string;
  configDir: string;
}

const DEFAULT_CONFIG: SuperOrchestratorConfig = {
  pythonPath: 'python3',
  scriptsDir: resolveSuperOrchestratorPath('scripts/super_orchestrator'),
  configDir: resolveSuperOrchestratorPath('config')
};

function resolveSuperOrchestratorPath(relativePath: string): string {
  const candidates = [
    join(process.cwd(), relativePath),
    join(process.cwd(), '..', relativePath),
    join(process.cwd(), '..', '..', relativePath),
    join(process.cwd(), '..', '..', '..', relativePath),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

export class SuperOrchestratorBridge {
  private config: SuperOrchestratorConfig;
  
  constructor(config: Partial<SuperOrchestratorConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      scriptsDir: config.scriptsDir ?? DEFAULT_CONFIG.scriptsDir,
      configDir: config.configDir ?? DEFAULT_CONFIG.configDir,
    };
    this.validatePaths();
  }
  
  private validatePaths(): void {
    if (!existsSync(this.config.scriptsDir)) {
      console.warn(`[super-orchestrator] Scripts dir not found: ${this.config.scriptsDir}`);
    }
    if (!existsSync(this.config.configDir)) {
      console.warn(`[super-orchestrator] Config dir not found: ${this.config.configDir}`);
    }
  }
  
  private async runPythonScript(scriptName: string, args: string[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      const scriptPath = join(this.config.scriptsDir, scriptName);
      
      if (!existsSync(scriptPath)) {
        reject(new Error(`Script not found: ${scriptPath}`));
        return;
      }
      
      const proc: ChildProcess = spawn(
        this.config.pythonPath,
        [scriptPath, ...args],
        {
          cwd: this.config.scriptsDir,
          env: { ...process.env, PYTHONPATH: this.config.scriptsDir },
          stdio: ['ignore', 'pipe', 'pipe']
        } as SpawnOptions
      );
      
      let stdout = '';
      let stderr = '';
      
      if (proc.stdout) {
        proc.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
        });
      }
      
      if (proc.stderr) {
        proc.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });
      }
      
      proc.on('close', (code: number | null) => {
        if (code === 0) {
          try {
            resolve(stdout ? JSON.parse(stdout) : {});
          } catch {
            resolve({ output: stdout });
          }
        } else {
          reject(new Error(`Script exited with code ${code}: ${stderr}`));
        }
      });
      
      proc.on('error', (err: Error) => {
        reject(err);
      });
    });
  }
  
  // === Provider Selection ===
  
  async selectProvider(prompt: string): Promise<{ provider: string; reasoning: string }> {
    try {
      const result = await this.runPythonScript('provider_selector.py', ['--select', '--prompt', prompt]);
      return result;
    } catch (err) {
      console.error('[super-orchestrator] selectProvider error:', err);
      return { provider: 'ollama-qwen', reasoning: 'Fallback to default' };
    }
  }
  
  async getProviderStatus(): Promise<any> {
    try {
      return await this.runPythonScript('provider_selector.py', ['--status']);
    } catch (err) {
      console.error('[super-orchestrator] getProviderStatus error:', err);
      return {};
    }
  }
  
  // === Performance Tracking ===
  
  async recordPerformance(
    providerId: string,
    taskType: string,
    latencyMs: number,
    success: boolean,
    cost: number = 0
  ): Promise<void> {
    try {
      await this.runPythonScript('performance_tracker.py', [
        '--record',
        '--provider', providerId,
        '--task', taskType,
        '--latency', String(latencyMs),
        '--success', String(success),
        '--cost', String(cost)
      ]);
    } catch (err) {
      console.error('[super-orchestrator] recordPerformance error:', err);
    }
  }
  
  async getPerformanceStats(): Promise<any> {
    try {
      return await this.runPythonScript('performance_tracker.py', ['--stats']);
    } catch (err) {
      console.error('[super-orchestrator] getPerformanceStats error:', err);
      return {};
    }
  }
  
  async getPerformanceDashboard(): Promise<string> {
    try {
      const result = await this.runPythonScript('performance_tracker.py', ['--dashboard']);
      return result.output || '';
    } catch (err) {
      console.error('[super-orchestrator] getPerformanceDashboard error:', err);
      return 'Error generating dashboard';
    }
  }
  
  // === Auto Evolution ===
  
  async generateEvolutionIdeas(): Promise<any[]> {
    try {
      const result = await this.runPythonScript('auto_evolution.py', ['--analyze']);
      return result.ideas || [];
    } catch (err) {
      console.error('[super-orchestrator] generateEvolutionIdeas error:', err);
      return [];
    }
  }
  
  async getPendingIdeas(): Promise<any[]> {
    try {
      return await this.runPythonScript('auto_evolution.py', ['--pending']);
    } catch (err) {
      console.error('[super-orchestrator] getPendingIdeas error:', err);
      return [];
    }
  }
  
  async applyIdea(ideaId: string): Promise<{ success: boolean; action: any }> {
    try {
      return await this.runPythonScript('auto_evolution.py', ['--apply', ideaId]);
    } catch (err) {
      console.error('[super-orchestrator] applyIdea error:', err);
      return { success: false, action: null };
    }
  }
  
  async getEvolutionReport(): Promise<string> {
    try {
      const result = await this.runPythonScript('auto_evolution.py', ['--report']);
      return result.output || '';
    } catch (err) {
      console.error('[super-orchestrator] getEvolutionReport error:', err);
      return 'Error generating report';
    }
  }
  
  // === Agent Pool Manager ===
  
  async getAgentPoolStatus(): Promise<any> {
    try {
      return await this.runPythonScript('agent_pool_manager.py', ['--status']);
    } catch (err) {
      console.error('[super-orchestrator] getAgentPoolStatus error:', err);
      return {};
    }
  }
  
  async findAvailableAgent(capabilities: string[], maxLatency?: number): Promise<string | null> {
    try {
      const args = ['--find', ...capabilities];
      if (maxLatency) {
        args.push('--max-latency', String(maxLatency));
      }
      const result = await this.runPythonScript('agent_pool_manager.py', args);
      return result.agent_id || null;
    } catch (err) {
      console.error('[super-orchestrator] findAvailableAgent error:', err);
      return null;
    }
  }
  
  async healthCheckAllAgents(): Promise<any> {
    try {
      return await this.runPythonScript('agent_pool_manager.py', ['--health-check']);
    } catch (err) {
      console.error('[super-orchestrator] healthCheckAllAgents error:', err);
      return { healthy: 0, unhealthy: 0, total: 0 };
    }
  }
  
  async getAgentPoolDashboard(): Promise<string> {
    try {
      const result = await this.runPythonScript('agent_pool_manager.py', ['--dashboard']);
      return result.output || '';
    } catch (err) {
      console.error('[super-orchestrator] getAgentPoolDashboard error:', err);
      return 'Error generating dashboard';
    }
  }
  
  // === Health Monitor ===
  
  async checkSystemHealth(): Promise<any> {
    try {
      return await this.runPythonScript('health_monitor.py', ['--check']);
    } catch (err) {
      console.error('[super-orchestrator] checkSystemHealth error:', err);
      return {};
    }
  }
  
  // === Cost Optimizer ===
  
  async getCostReport(): Promise<any> {
    try {
      return await this.runPythonScript('cost_optimizer.py', ['--report']);
    } catch (err) {
      console.error('[super-orchestrator] getCostReport error:', err);
      return {};
    }
  }
  
  async getCostAlerts(): Promise<any[]> {
    try {
      return await this.runPythonScript('cost_optimizer.py', ['--alerts']);
    } catch (err) {
      console.error('[super-orchestrator] getCostAlerts error:', err);
      return [];
    }
  }
  
  // === Idea Generator ===
  
  async generateIdeas(context: string): Promise<any[]> {
    try {
      return await this.runPythonScript('idea_generator.py', ['--generate', context]);
    } catch (err) {
      console.error('[super-orchestrator] generateIdeas error:', err);
      return [];
    }
  }
  
  // === Git Automation ===
  
  async autoCommit(message: string, branch?: string): Promise<any> {
    try {
      const args = ['--commit', message];
      if (branch) args.push('--branch', branch);
      return await this.runPythonScript('git_automation.py', args);
    } catch (err) {
      console.error('[super-orchestrator] autoCommit error:', err);
      return { success: false, error: String(err) };
    }
  }
  
  async autoPush(branch: string = 'main'): Promise<any> {
    try {
      return await this.runPythonScript('git_automation.py', ['--push', branch]);
    } catch (err) {
      console.error('[super-orchestrator] autoPush error:', err);
      return { success: false, error: String(err) };
    }
  }
  
  // === N8n Trigger ===
  
  async triggerN8nWorkflow(workflowName: string, payload: object): Promise<any> {
    try {
      return await this.runPythonScript('n8n_trigger.py', [
        '--trigger', workflowName,
        '--payload', JSON.stringify(payload)
      ]);
    } catch (err) {
      console.error('[super-orchestrator] triggerN8nWorkflow error:', err);
      return { success: false, error: String(err) };
    }
  }
  
  // === Unified Dashboard ===
  
  async getUnifiedDashboard(): Promise<string> {
    const sections: string[] = [];
    
    try {
      sections.push('=== SUPER ORCHESTRATOR DASHBOARD ===\n');
      
      // Performance
      const perfStats = await this.getPerformanceStats();
      sections.push('📊 PERFORMANCE:');
      if (perfStats.providers) {
        for (const [provider, stats] of Object.entries(perfStats.providers as Record<string, any>)) {
          if (stats.status !== 'no_data') {
            sections.push(`   ${provider}: ${(stats.success_rate * 100).toFixed(1)}% success, ${stats.avg_latency_ms?.toFixed(0)}ms`);
          }
        }
      }
      
      // Agent Pool
      const poolStatus = await this.getAgentPoolStatus();
      sections.push('\n🤖 AGENT POOL:');
      sections.push(`   Total: ${poolStatus.total_agents || 0}, Load: ${poolStatus.total_load || 0}/${poolStatus.max_load || 0}`);
      
      // Health
      const health = await this.checkSystemHealth();
      sections.push('\n💚 HEALTH:');
      for (const [service, status] of Object.entries(health as Record<string, any>)) {
        sections.push(`   ${service}: ${status.status || 'unknown'}`);
      }
      
      // Ideas
      const ideas = await this.getPendingIdeas();
      sections.push(`\n💡 PENDING IDEAS: ${ideas.length}`);
      
      sections.push('\n' + '='.repeat(50));
      
      return sections.join('\n');
    } catch (err) {
      return `Error generating unified dashboard: ${err}`;
    }
  }
}

// Export singleton instance
export const superOrchestrator = new SuperOrchestratorBridge();

// CLI entry point
if (require.main === module) {
  const bridge = new SuperOrchestratorBridge();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'dashboard':
      bridge.getUnifiedDashboard().then(console.log);
      break;
    case 'health':
      bridge.checkSystemHealth().then((r) => console.log(JSON.stringify(r, null, 2)));
      break;
    case 'providers':
      bridge.getProviderStatus().then((r) => console.log(JSON.stringify(r, null, 2)));
      break;
    case 'pool':
      bridge.getAgentPoolDashboard().then(console.log);
      break;
    case 'evolution':
      bridge.getEvolutionReport().then(console.log);
      break;
    default:
      console.log('Usage: node super-orchestrator-bridge.js <command>');
      console.log('Commands: dashboard, health, providers, pool, evolution');
  }
}
