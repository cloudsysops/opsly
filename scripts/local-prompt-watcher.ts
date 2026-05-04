#!/usr/bin/env node

/**
 * LocalPromptWatcher
 *
 * Monitors .cursor/prompts/ directory for new .md files
 * Automatically submits them to orchestrator /api/local/prompt-submit
 *
 * Usage:
 *   npx tsx scripts/local-prompt-watcher.ts [--cursor-dir .cursor] [--orchestrator-url http://localhost:3011]
 *
 * Environment variables:
 *   CURSOR_DIR - .cursor directory path (default: .cursor)
 *   ORCHESTRATOR_URL - Orchestrator health server URL (default: http://localhost:3011)
 *   PLATFORM_ADMIN_TOKEN - Token for authentication (required)
 */

import { promises as fsp } from 'fs';
import * as path from 'path';
import { watch } from 'chokidar';

interface PromptMetadata {
  jobId: string;
  filename: string;
  submittedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  agentRole: string;
  error?: string;
}

interface WatcherState {
  [filename: string]: PromptMetadata;
}

interface FrontmatterData {
  agent_role?: string;
  max_steps?: number;
  goal?: string;
  context?: Record<string, unknown>;
  priority?: number;
}

class LocalPromptWatcher {
  private cursorDir: string;
  private orchestratorUrl: string;
  private adminToken: string;
  private promptsDir: string;
  private metadataFile: string;
  private state: WatcherState = {};
  private processedFiles = new Set<string>();

  constructor(
    cursorDir: string = '.cursor',
    orchestratorUrl: string = 'http://localhost:3011',
    adminToken: string = '',
  ) {
    this.cursorDir = cursorDir;
    this.orchestratorUrl = orchestratorUrl;
    this.adminToken = adminToken;
    this.promptsDir = path.join(cursorDir, 'prompts');
    this.metadataFile = path.join(this.promptsDir, '.metadata.json');
  }

  private parseFrontmatter(content: string): { frontmatter: FrontmatterData; body: string } {
    const lines = content.split('\n');
    const frontmatter: FrontmatterData = {};
    let bodyStart = 0;

    // Check for YAML frontmatter (--- ... ---)
    if (lines[0]?.trim() === '---') {
      let fmEnd = 1;
      while (fmEnd < lines.length && lines[fmEnd]?.trim() !== '---') {
        const line = lines[fmEnd]!;
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          const [, key, value] = match;
          if (key === 'max_steps') {
            frontmatter.max_steps = Number.parseInt(value, 10);
          } else if (key === 'priority') {
            frontmatter.priority = Number.parseInt(value, 10);
          } else {
            (frontmatter as Record<string, unknown>)[key] = value;
          }
        }
        fmEnd++;
      }
      bodyStart = fmEnd + 1;
    }

    const body = lines.slice(bodyStart).join('\n').trim();
    return { frontmatter, body };
  }

  private async loadState(): Promise<void> {
    try {
      const data = await fsp.readFile(this.metadataFile, 'utf-8');
      this.state = JSON.parse(data) as WatcherState;
      console.log(`[LocalPromptWatcher] Loaded metadata: ${Object.keys(this.state).length} entries`);
    } catch {
      this.state = {};
    }
  }

  private async saveState(): Promise<void> {
    try {
      await fsp.writeFile(this.metadataFile, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('[LocalPromptWatcher] Error saving metadata:', err);
    }
  }

  private async submitPrompt(filePath: string, filename: string): Promise<void> {
    try {
      // Skip if already processed in this run
      if (this.processedFiles.has(filename)) {
        return;
      }
      this.processedFiles.add(filename);

      // Read file content
      const content = await fsp.readFile(filePath, 'utf-8');
      const { frontmatter, body } = this.parseFrontmatter(content);

      const agentRole = (frontmatter.agent_role || 'executor').toString();
      const maxSteps = frontmatter.max_steps || 10;
      const goal = (frontmatter.goal || '').toString();
      const context = frontmatter.context || {};

      // Generate request ID from filename
      const requestId = filename.replace(/\.md$/, '').replace(/[^a-z0-9-]/gi, '');

      console.log(
        `[LocalPromptWatcher] Submitting ${filename} (agent: ${agentRole}, steps: ${maxSteps})`,
      );

      // Submit to orchestrator
      const response = await fetch(`${this.orchestratorUrl}/api/local/prompt-submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.adminToken}`,
        },
        body: JSON.stringify({
          prompt_body: body,
          agent_role: agentRole,
          max_steps: maxSteps,
          goal,
          context,
          request_id: requestId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${errorText || response.statusText}`,
        );
      }

      const result = (await response.json()) as { job_id?: string; request_id?: string };
      const jobId = result.job_id || result.request_id || requestId;

      // Track in metadata
      this.state[filename] = {
        jobId,
        filename,
        submittedAt: new Date().toISOString(),
        status: 'pending',
        agentRole,
      };

      console.log(
        `[LocalPromptWatcher] ✅ Submitted ${filename} as job ${jobId}`,
      );
      await this.saveState();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[LocalPromptWatcher] ❌ Failed to submit ${filename}:`, errorMsg);

      // Track error in metadata
      this.state[filename] = {
        jobId: '',
        filename,
        submittedAt: new Date().toISOString(),
        status: 'failed',
        agentRole: 'unknown',
        error: errorMsg,
      };
      await this.saveState();
    }
  }

  async start(): Promise<void> {
    // Load existing state
    await this.loadState();

    // Ensure prompts directory exists
    try {
      await fsp.mkdir(this.promptsDir, { recursive: true });
    } catch (err) {
      console.error('[LocalPromptWatcher] Failed to create prompts dir:', err);
      return;
    }

    console.log(`[LocalPromptWatcher] Watching ${this.promptsDir} for changes...`);
    console.log(`[LocalPromptWatcher] Orchestrator: ${this.orchestratorUrl}`);

    const watcher = watch(`${this.promptsDir}/*.md`, {
      persistent: true,
      ignored: [
        '**/.*',
        '**/responses/**',
        '**/pending/**',
        '**/.gitignore',
      ],
    });

    watcher.on('add', (filePath: string) => {
      const filename = path.basename(filePath);
      console.log(`[LocalPromptWatcher] Detected new file: ${filename}`);
      void this.submitPrompt(filePath, filename);
    });

    watcher.on('error', (err: unknown) => {
      console.error('[LocalPromptWatcher] Watcher error:', err);
    });

    console.log('[LocalPromptWatcher] Ready. Create .md files in .cursor/prompts/ to submit');
  }
}

async function main(): Promise<void> {
  const cursorDir = process.env.CURSOR_DIR || '.cursor';
  const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3011';
  const adminToken = process.env.PLATFORM_ADMIN_TOKEN || '';

  if (!adminToken) {
    console.error(
      '[LocalPromptWatcher] ERROR: PLATFORM_ADMIN_TOKEN not set in environment',
    );
    process.exit(1);
  }

  const watcher = new LocalPromptWatcher(cursorDir, orchestratorUrl, adminToken);
  await watcher.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('[LocalPromptWatcher] Shutting down...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('[LocalPromptWatcher] Shutting down...');
    process.exit(0);
  });
}

void main().catch((err) => {
  console.error('[LocalPromptWatcher] Fatal error:', err);
  process.exit(1);
});
