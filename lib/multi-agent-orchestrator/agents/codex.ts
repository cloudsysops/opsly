/**
 * Codex Agent
 * Executes tasks via GitHub Copilot (requires subscription)
 */

import type { Agent, Task, TaskResult } from '../types';

export interface CodexConfig {
  apiKey?: string;
  maxConcurrent?: number;
  timeout?: number;
  model?: string;
}

export class CodexAgent implements Agent {
  id = 'codex';
  type: 'codex' = 'codex';
  costPerTask = 0.20; // Lower cost than Claude Remote
  estimatedTaskTime = 10; // 10 minutes average
  maxConcurrent = 5;
  capabilities = ['code_edit', 'commit', 'validation', 'testing'];

  private apiKey: string;
  private timeout: number;
  private model: string;

  constructor(private config: CodexConfig = {}) {
    this.apiKey = config.apiKey || process.env.CODEX_API_KEY || '';
    this.timeout = config.timeout || 45 * 60 * 1000; // 45 minutes default
    this.model = config.model || 'code-davinci-002';
  }

  isAvailable(): boolean {
    // Check if API key is configured and valid
    return !!this.apiKey;
  }

  async execute(task: Task): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      if (!this.isAvailable()) {
        throw new Error('Codex is not configured. Set CODEX_API_KEY environment variable.');
      }

      this.log('info', `Executing task ${task.id} via Codex`, { taskType: task.taskType });

      const result = await this.executeViaCodexAPI(task);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        taskId: task.id,
        agentId: this.id,
        output: result.output,
        tokensUsed: result.tokensUsed,
        executionTime,
        cost: this.calculateCost(result.tokensUsed),
        commits: result.commits,
        metadata: {
          source: 'codex',
          model: this.model,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.log('error', `Task execution failed: ${task.id}`, { error });

      return {
        success: false,
        taskId: task.id,
        agentId: this.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        tokensUsed: 0,
        executionTime,
        cost: 0,
        metadata: { error: true },
      };
    }
  }

  private async executeViaCodexAPI(
    task: Task
  ): Promise<{
    output: string;
    tokensUsed: number;
    commits?: Array<{ hash: string; message: string }>;
  }> {
    // TODO: Implement actual Codex API call using OpenAI API

    // Placeholder: simulate API call
    await this.delay(2000);

    const estimatedTokens = Math.floor((task.estimatedTokens || 4000) * 0.8); // Codex uses fewer tokens

    return {
      output: `Task ${task.id} executed via Codex`,
      tokensUsed: estimatedTokens,
      commits: [
        {
          hash: 'codex-abc123',
          message: `feat(codex): ${task.title}`,
        },
      ],
    };
  }

  private calculateCost(tokensUsed: number): number {
    // Codex pricing: cheaper than Claude
    return tokensUsed * 0.000002;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(level: string, message: string, data?: unknown): void {
    console.log(`[${level.toUpperCase()}] [CodexAgent] ${message}`, data || '');
  }
}

export default CodexAgent;
