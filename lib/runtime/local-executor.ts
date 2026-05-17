/**
 * Local Executor - Ejecuta prompts en agentes locales
 * Parte del pipeline Local-First
 */

import { spawn } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { detectEnvironment, healthCheck, EnvironmentCapabilities } from './environment-detector';

export interface ExecutionRequest {
  prompt: string;
  agent?: 'auto' | 'cursor' | 'claude' | 'codex' | 'opencode' | 'ollama';
  context?: string;
  timeout?: number;
  budget?: 'low' | 'medium' | 'high';
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  agent: string;
  duration: number;
  tokens?: number;
}

export interface ExecutionConfig {
  maxRetries: number;
  retryDelay: number;
  defaultTimeout: number;
  tempDir: string;
}

/**
 * Determina qué agente usar basado en budget
 */
function selectAgentForBudget(
  env: EnvironmentCapabilities,
  budget: ExecutionRequest['budget'] = 'medium'
): string {
  if (budget === 'low' && env.ollama.running) {
    return 'ollama';
  }

  if (budget === 'medium') {
    if (env.agents.cursor.installed) return 'cursor';
    if (env.ollama.running) return 'ollama';
    return 'claude';
  }

  // high budget - prefer cloud agents
  if (env.agents.claude.installed) return 'claude';
  if (env.agents.cursor.installed) return 'cursor';
  return 'remote';
}

/**
 * Ejecuta prompt en Cursor
 */
async function executeWithCursor(prompt: string, timeout: number): Promise<ExecutionResult> {
  const start = Date.now();

  // Cursor CLI: cursor --prompt "..." o usar la API
  // Por ahora, usamos una aproximación con apple-script (macOS)
  if (process.platform === 'darwin') {
    try {
      const script = `tell application "Cursor" to activate
delay 1
tell application "System Events" to keystroke "${prompt.replace(/"/g, '\\"')}"`;

      return new Promise((resolve) => {
        const proc = spawn('osascript', ['-e', script], { timeout });
        let output = '';

        proc.stdout.on('data', (data) => { output += data.toString(); });
        proc.stderr.on('data', (data) => { output += data.toString(); });

        proc.on('close', (code) => {
          resolve({
            success: code === 0,
            output: output.substring(0, 5000),
            agent: 'cursor',
            duration: Date.now() - start,
          });
        });

        proc.on('error', (err) => {
          resolve({
            success: false,
            error: err.message,
            agent: 'cursor',
            duration: Date.now() - start,
          });
        });
      });
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        agent: 'cursor',
        duration: Date.now() - start,
      };
    }
  }

  // Fallback para Linux/Windows - usar CLI si está disponible
  try {
    return new Promise((resolve) => {
      const proc = spawn('cursor', ['--version'], { timeout: 5000 });
      proc.on('close', () => {
        resolve({
          success: false,
          error: 'Cursor CLI not available',
          agent: 'cursor',
          duration: Date.now() - start,
        });
      });
      proc.on('error', () => {
        resolve({
          success: false,
          error: 'Cursor not found',
          agent: 'cursor',
          duration: Date.now() - start,
        });
      });
    });
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      agent: 'cursor',
      duration: Date.now() - start,
    };
  }
}

/**
 * Ejecuta prompt en Claude CLI
 */
async function executeWithClaude(prompt: string, timeout: number): Promise<ExecutionResult> {
  const start = Date.now();

  try {
    // Claude CLI: claude --print "prompt"
    return new Promise((resolve) => {
      const proc = spawn('claude', ['--print', prompt], {
        timeout,
        env: { ...process.env, ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '' },
      });

      let output = '';
      let error = '';

      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { error += data.toString(); });

      proc.on('close', (code) => {
        if (code === 0 && output) {
          resolve({
            success: true,
            output: output.substring(0, 10000),
            agent: 'claude',
            duration: Date.now() - start,
          });
        } else {
          resolve({
            success: false,
            error: error || 'Claude CLI failed',
            agent: 'claude',
            duration: Date.now() - start,
          });
        }
      });

      proc.on('error', (err) => {
        resolve({
          success: false,
          error: err.message,
          agent: 'claude',
          duration: Date.now() - start,
        });
      });
    });
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      agent: 'claude',
      duration: Date.now() - start,
    };
  }
}

/**
 * Ejecuta prompt en Ollama (local LLM)
 */
async function executeWithOllama(
  prompt: string,
  model: string = 'llama3.2',
  timeout: number
): Promise<ExecutionResult> {
  const start = Date.now();

  try {
    return new Promise((resolve) => {
      const proc = spawn('ollama', ['run', model, prompt], {
        timeout,
        env: { ...process.env },
      });

      let output = '';
      let error = '';

      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { error += data.toString(); });

      proc.on('close', (code) => {
        // Ollama puede producir output en stdout o stderr dependiendo del modelo
        const finalOutput = output || error;

        if (code === 0 || finalOutput.length > 0) {
          resolve({
            success: true,
            output: finalOutput.substring(0, 10000),
            agent: 'ollama',
            duration: Date.now() - start,
            tokens: Math.ceil(finalOutput.length / 4), // Rough estimate
          });
        } else {
          resolve({
            success: false,
            error: error || 'Ollama failed',
            agent: 'ollama',
            duration: Date.now() - start,
          });
        }
      });

      proc.on('error', (err) => {
        resolve({
          success: false,
          error: err.message,
          agent: 'ollama',
          duration: Date.now() - start,
        });
      });
    });
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      agent: 'ollama',
      duration: Date.now() - start,
    };
  }
}

/**
 * Ejecuta prompt en Codex
 */
async function executeWithCodex(prompt: string, timeout: number): Promise<ExecutionResult> {
  const start = Date.now();

  try {
    return new Promise((resolve) => {
      const proc = spawn('codex', ['-p', prompt], { timeout });

      let output = '';

      proc.stdout.on('data', (data) => { output += data.toString(); });

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output.substring(0, 10000),
          agent: 'codex',
          duration: Date.now() - start,
        });
      });

      proc.on('error', (err) => {
        resolve({
          success: false,
          error: err.message,
          agent: 'codex',
          duration: Date.now() - start,
        });
      });
    });
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      agent: 'codex',
      duration: Date.now() - start,
    };
  }
}

/**
 * Ejecuta prompt en OpenCode
 */
async function executeWithOpenCode(prompt: string, timeout: number): Promise<ExecutionResult> {
  const start = Date.now();

  try {
    return new Promise((resolve) => {
      const proc = spawn('opencode', ['-p', prompt], { timeout });

      let output = '';

      proc.stdout.on('data', (data) => { output += data.toString(); });

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output.substring(0, 10000),
          agent: 'opencode',
          duration: Date.now() - start,
        });
      });

      proc.on('error', (err) => {
        resolve({
          success: false,
          error: err.message,
          agent: 'opencode',
          duration: Date.now() - start,
        });
      });
    });
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      agent: 'opencode',
      duration: Date.now() - start,
    };
  }
}

/**
 * Función principal: ejecutar prompt en agente local
 */
export async function executeLocalAgent(request: ExecutionRequest): Promise<ExecutionResult> {
  // Get environment
  const env = await detectEnvironment();

  // Health check
  const health = await healthCheck();
  if (!health.healthy) {
    return {
      success: false,
      error: `Environment unhealthy: ${health.errors.join(', ')}`,
      agent: 'unknown',
      duration: 0,
    };
  }

  // Select agent
  const agentInput = request.agent || 'auto';
  const selectedAgent = agentInput === 'auto'
    ? selectAgentForBudget(env, request.budget || 'medium')
    : agentInput;

  const timeout = request.timeout || 60000;

  // Execute
  switch (selectedAgent) {
    case 'cursor':
      return executeWithCursor(request.prompt, timeout);
    case 'claude':
      return executeWithClaude(request.prompt, timeout);
    case 'ollama':
      return executeWithOllama(request.prompt, env.ollama.defaultModel || 'llama3.2', timeout);
    case 'codex':
      return executeWithCodex(request.prompt, timeout);
    case 'opencode':
      return executeWithOpenCode(request.prompt, timeout);
    default:
      return {
        success: false,
        error: `Unknown agent: ${selectedAgent}`,
        agent: selectedAgent,
        duration: 0,
      };
  }
}

/**
 * Retry wrapper
 */
export async function executeWithRetry(
  request: ExecutionRequest,
  config: Partial<ExecutionConfig> = {}
): Promise<ExecutionResult> {
  const maxRetries = config.maxRetries ?? 3;
  const retryDelay = config.retryDelay ?? 2000;
  const defaultTimeout = config.defaultTimeout ?? 60000;

  let lastResult: ExecutionResult | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }

    const result = await executeLocalAgent({
      ...request,
      timeout: request.timeout || defaultTimeout,
    });

    if (result.success) {
      return result;
    }

    lastResult = result;

    // Don't retry on certain errors
    if (result.error?.includes('not found') || result.error?.includes('not available')) {
      break;
    }
  }

  return lastResult || {
    success: false,
    error: 'Max retries exceeded',
    agent: 'unknown',
    duration: 0,
  };
}

export default { executeLocalAgent, executeWithRetry };