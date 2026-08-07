/**
 * Cursor Local Agent
 * Executes tasks on local machine via Cursor editor + git hooks
 */

import type { Agent, Task, TaskResult } from '../types';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface CursorLocalConfig {
  workingDirectory?: string;
  maxConcurrent?: number;
  timeout?: number;
  configFile?: string;
}

export class CursorLocalAgent implements Agent {
  id = 'cursor_local';
  type: 'cursor_local' = 'cursor_local';
  costPerTask = 0; // Free (runs locally)
  estimatedTaskTime = 12; // 12 minutes average
  maxConcurrent = 1; // Sequential execution preferred
  capabilities = ['code_edit', 'commit', 'validation', 'testing'];

  private workingDirectory: string;
  private timeout: number;
  private configFile: string;

  constructor(private config: CursorLocalConfig = {}) {
    this.workingDirectory = config.workingDirectory || process.cwd();
    this.timeout = config.timeout || 30 * 60 * 1000; // 30 minutes default
    this.configFile = config.configFile || '.cursor-auto-work.json';
  }

  isAvailable(): boolean {
    // Check if Cursor is installed and .cursor-auto-work.json can be written
    try {
      return fs.existsSync(path.join(this.workingDirectory, '.cursor'));
    } catch {
      return false;
    }
  }

  async execute(task: Task): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      this.log('info', `Executing task ${task.id} locally`, { taskType: task.taskType });

      // Write task config to .cursor-auto-work.json
      await this.writeTaskConfig(task);

      // Trigger the git hook or Cursor directly
      const result = await this.executeViaGitHook();

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        taskId: task.id,
        agentId: this.id,
        output: result.output,
        tokensUsed: 0, // Local execution uses no tokens
        executionTime,
        cost: 0,
        commits: result.commits,
        metadata: {
          source: 'cursor_local',
          workingDirectory: this.workingDirectory,
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

  private async writeTaskConfig(task: Task): Promise<void> {
    const configPath = path.join(this.workingDirectory, this.configFile);

    const config = {
      task: {
        id: task.id,
        type: task.taskType,
        title: task.title,
        description: task.description,
        files_to_edit: task.files_to_edit,
        checklist: task.checklist || [],
        priority: task.priority || 'medium',
      },
      timestamp: new Date().toISOString(),
      source: 'orchestrator',
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    this.log('info', `Task config written to ${configPath}`);
  }

  private async executeViaGitHook(): Promise<{
    output: string;
    commits?: Array<{ hash: string; message: string }>;
  }> {
    return new Promise((resolve, reject) => {
      // Trigger the post-checkout hook or use Cursor CLI directly
      // This simulates running the git hook that Cursor watches

      const script = path.join(this.workingDirectory, '.cursor-auto-work.sh');

      if (!fs.existsSync(script)) {
        return resolve({
          output: 'Task config written. Cursor will detect and execute on file change.',
          commits: [],
        });
      }

      const process = spawn('bash', [script], {
        cwd: this.workingDirectory,
        timeout: this.timeout,
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', data => {
        stdout += data.toString();
      });

      process.stderr?.on('data', data => {
        stderr += data.toString();
      });

      process.on('close', code => {
        if (code === 0) {
          resolve({
            output: stdout,
            commits: [
              {
                hash: 'local-execution',
                message: 'Local Cursor execution completed',
              },
            ],
          });
        } else {
          reject(new Error(`Script failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', err => {
        reject(err);
      });
    });
  }

  private log(level: string, message: string, data?: unknown): void {
    console.log(`[${level.toUpperCase()}] [CursorLocalAgent] ${message}`, data || '');
  }
}

export default CursorLocalAgent;
