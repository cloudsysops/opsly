#!/usr/bin/env node

/**
 * CursorAgent Service
 *
 * HTTP service that runs on MacBook (port 5001)
 * Receives prompts from orchestrator workers
 * Opens Cursor IDE with the prompt
 * Waits for and returns response
 *
 * Usage:
 *   npx tsx scripts/cursor-agent-service.ts [--port 5001]
 *
 * Flow:
 * 1. POST /execute with { prompt_path, prompt_content, job_id }
 * 2. Open Cursor IDE with prompt file
 * 3. Wait for response file in .cursor/responses/
 * 4. Return response path via HTTP
 */

import express, { Request, Response } from 'express';
import { promises as fsp } from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import { watch } from 'chokidar';

interface ExecutionRequest {
  prompt_path: string;
  prompt_content: string;
  job_id: string;
  agent_role?: string;
  max_steps?: number;
}

interface ExecutionResponse {
  success: boolean;
  response_path?: string;
  error?: string;
}

class CursorAgentService {
  private app: express.Application;
  private port: number;
  private cursorDir: string;
  private pendingResponses: Map<string, Promise<string>> = new Map();
  private responseResolvers: Map<string, (value: string) => void> = new Map();

  constructor(
    port: number = 5001,
    cursorDir: string = path.join(process.cwd(), '.cursor'),
  ) {
    this.port = port;
    this.cursorDir = cursorDir;
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.use(express.json());

    /**
     * Health check endpoint
     */
    this.app.head('/health', (req: Request, res: Response) => {
      res.status(200).send('OK');
    });

    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', service: 'cursor-agent' });
    });

    /**
     * Execute prompt via Cursor IDE
     */
    this.app.post('/execute', async (req: Request, res: Response) => {
      try {
        const request = req.body as ExecutionRequest;
        const { prompt_path, prompt_content, job_id, agent_role, max_steps } = request;

        console.log(`[CursorAgent] Received execution request for job ${job_id}`);

        if (!job_id) {
          res.status(400).json({ success: false, error: 'job_id is required' });
          return;
        }

        // Write prompt to pending file
        const pendingDir = path.join(this.cursorDir, 'prompts', 'pending');
        await fsp.mkdir(pendingDir, { recursive: true });

        const promptFile = path.join(pendingDir, `prompt-${job_id}.md`);
        const promptWithMetadata = this.addPromptMetadata(prompt_content, job_id, agent_role, max_steps);
        await fsp.writeFile(promptFile, promptWithMetadata, 'utf-8');

        console.log(`[CursorAgent] Prompt written to ${promptFile}`);

        // Open Cursor with the prompt
        this.openCursorWithPrompt(promptFile)
          .then(() => {
            console.log(`[CursorAgent] Cursor opened for job ${job_id}`);
          })
          .catch((err) => {
            console.error(`[CursorAgent] Error opening Cursor:`, err);
          });

        // Wait for response with timeout (60 seconds)
        const responsePromise = this.waitForResponse(job_id, 60000);

        // Return immediately with response path once available
        const responsePath = await responsePromise;

        res.json({
          success: true,
          response_path: responsePath,
        } as ExecutionResponse);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[CursorAgent] Error:`, errorMsg);
        res.status(500).json({
          success: false,
          error: errorMsg,
        } as ExecutionResponse);
      }
    });

    /**
     * List pending prompts
     */
    this.app.get('/pending', async (req: Request, res: Response) => {
      try {
        const pendingDir = path.join(this.cursorDir, 'prompts', 'pending');
        const files = await fsp.readdir(pendingDir).catch(() => []);
        res.json({ pending: files });
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });

    /**
     * List responses
     */
    this.app.get('/responses', async (req: Request, res: Response) => {
      try {
        const responsesDir = path.join(this.cursorDir, 'responses');
        const files = await fsp.readdir(responsesDir).catch(() => []);
        res.json({ responses: files });
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });
  }

  /**
   * Add metadata headers to prompt
   */
  private addPromptMetadata(
    content: string,
    jobId: string,
    agentRole?: string,
    maxSteps?: number,
  ): string {
    let header = `---\njob_id: ${jobId}\n`;
    if (agentRole) header += `agent_role: ${agentRole}\n`;
    if (maxSteps) header += `max_steps: ${maxSteps}\n`;
    header += `created_at: ${new Date().toISOString()}\n---\n\n`;
    return header + content;
  }

  /**
   * Open Cursor with prompt file
   * Uses AppleScript on macOS, fallback to 'open' command
   */
  private async openCursorWithPrompt(promptFile: string): Promise<void> {
    try {
      // Try using 'open' command (works on macOS)
      const openCmd = `open -a "Cursor" "${promptFile}"`;
      console.log(`[CursorAgent] Executing: ${openCmd}`);
      execSync(openCmd, { stdio: 'pipe' });
    } catch (err) {
      // Fallback: try direct cursor command
      try {
        const cursorCmd = `cursor "${promptFile}"`;
        console.log(`[CursorAgent] Executing: ${cursorCmd}`);
        execSync(cursorCmd, { stdio: 'pipe' });
      } catch (fallbackErr) {
        console.error('[CursorAgent] Failed to open Cursor:', fallbackErr);
        throw new Error('Unable to open Cursor IDE - check if Cursor is installed');
      }
    }
  }

  /**
   * Wait for response file to appear in .cursor/responses/
   * Returns path when response is available
   */
  private waitForResponse(jobId: string, timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const responsePath = path.join(this.cursorDir, 'responses', `response-${jobId}.md`);
      const startTime = Date.now();

      // Check if response already exists
      fsp.access(responsePath)
        .then(() => {
          console.log(`[CursorAgent] Response found immediately: ${responsePath}`);
          resolve(responsePath);
        })
        .catch(() => {
          // Response doesn't exist yet, watch for it
          const watcher = watch(path.join(this.cursorDir, 'responses'), {
            ignored: [(p: string) => !p.includes(`response-${jobId}.md`)],
            awaitWriteFinish: {
              stabilityThreshold: 1000,
              pollInterval: 100,
            },
          });

          const timeoutHandle = setTimeout(() => {
            watcher.close();
            reject(new Error(`Response timeout: job ${jobId} did not respond within ${timeoutMs}ms`));
          }, timeoutMs);

          watcher.on('add', (filePath: string) => {
            if (filePath.includes(`response-${jobId}.md`)) {
              clearTimeout(timeoutHandle);
              watcher.close();
              console.log(`[CursorAgent] Response detected: ${filePath}`);
              resolve(filePath);
            }
          });

          watcher.on('error', (err) => {
            clearTimeout(timeoutHandle);
            watcher.close();
            reject(err);
          });
        });
    });
  }

  /**
   * Start the HTTP server
   */
  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`[CursorAgent] Service running on port ${this.port}`);
      console.log(`[CursorAgent] Ready to receive prompts at http://localhost:${this.port}/execute`);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n[CursorAgent] Shutting down...');
      process.exit(0);
    });
  }
}

// Main: Parse arguments and start service
const portArg = process.argv.find((arg) => arg.startsWith('--port='))?.split('=')[1];
const port = portArg ? parseInt(portArg, 10) : 5001;

const service = new CursorAgentService(port);
service.start();
