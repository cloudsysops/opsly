#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { promises as fsp } from 'fs';
import fetch from 'node-fetch';
import * as yaml from 'yaml';
import { watch } from 'chokidar';

interface PromptMetadata {
  path: string;
  filename: string;
  job_id?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  submitted_at?: string;
  completed_at?: string;
  error?: string;
}

interface PromptFrontmatter {
  agent_role?: string;
  max_steps?: number;
  max_iterations?: number;
  context?: Record<string, unknown>;
  goal?: string;
  priority?: number;
}

interface LocalWatcherOptions {
  cursorDir: string;
  orchestratorUrl: string;
  orchestratorToken?: string;
}

class LocalPromptWatcher {
  private cursorDir: string;
  private promptsDir: string;
  private responsesDir: string;
  private metadataPath: string;
  private metadata: Map<string, PromptMetadata> = new Map();
  private orchestratorUrl: string;
  private orchestratorToken: string;
  private isProcessing = new Set<string>();

  constructor(options: LocalWatcherOptions) {
    this.cursorDir = options.cursorDir;
    this.promptsDir = path.join(this.cursorDir, 'prompts');
    this.responsesDir = path.join(this.promptsDir, 'responses');
    this.metadataPath = path.join(this.promptsDir, '.metadata.json');
    this.orchestratorUrl = options.orchestratorUrl;
    this.orchestratorToken = options.orchestratorToken || process.env.PLATFORM_ADMIN_TOKEN || 'local-dev';
  }

  async initialize() {
    // Create directories if they don't exist
    await fsp.mkdir(this.promptsDir, { recursive: true });
    await fsp.mkdir(this.responsesDir, { recursive: true });

    // Load existing metadata
    await this.loadMetadata();

    console.log(`[LocalWatcher] Initialized at ${this.promptsDir}`);
  }

  private async loadMetadata() {
    try {
      const content = await fsp.readFile(this.metadataPath, 'utf-8');
      const data = JSON.parse(content);
      for (const [key, value] of Object.entries(data)) {
        this.metadata.set(key, value as PromptMetadata);
      }
    } catch (err) {
      // Metadata file doesn't exist yet, that's fine
      this.metadata.clear();
    }
  }

  private async saveMetadata() {
    const data = Object.fromEntries(this.metadata);
    await fsp.writeFile(this.metadataPath, JSON.stringify(data, null, 2));
  }

  private parsePromptFile(content: string): {
    frontmatter: PromptFrontmatter;
    body: string;
  } {
    const lines = content.split('\n');
    let inFrontmatter = false;
    const frontmatterLines: string[] = [];
    let bodyStart = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (i === 0 && line.trim() === '---') {
        inFrontmatter = true;
        continue;
      }

      if (inFrontmatter && line.trim() === '---') {
        inFrontmatter = false;
        bodyStart = i + 1;
        break;
      }

      if (inFrontmatter) {
        frontmatterLines.push(line);
      }
    }

    const frontmatterText = frontmatterLines.join('\n');
    const body = lines.slice(bodyStart).join('\n').trim();

    let frontmatter: PromptFrontmatter = {};
    try {
      frontmatter = yaml.parse(frontmatterText) || {};
    } catch (err) {
      console.warn(`[LocalWatcher] Failed to parse frontmatter: ${err}`);
    }

    return { frontmatter, body };
  }

  private async submitPrompt(
    promptPath: string,
    filename: string,
    frontmatter: PromptFrontmatter,
    body: string,
  ) {
    if (this.isProcessing.has(filename)) {
      console.log(`[LocalWatcher] Already processing ${filename}, skipping`);
      return;
    }

    this.isProcessing.add(filename);

    try {
      const payload = {
        prompt_path: promptPath,
        agent_role: frontmatter.agent_role || 'executor',
        context: frontmatter.context || {},
        goal: frontmatter.goal,
        prompt_body: body,
        max_steps: frontmatter.max_steps || 10,
        max_iterations: frontmatter.max_iterations,
        priority: frontmatter.priority || 50000,
      };

      console.log(`[LocalWatcher] Submitting ${filename}...`);

      const response = await fetch(`${this.orchestratorUrl}/api/local/prompt-submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.orchestratorToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      const result = (await response.json()) as { job_id: string };
      const jobId = result.job_id;

      // Update metadata
      this.metadata.set(filename, {
        path: promptPath,
        filename,
        job_id: jobId,
        status: 'processing',
        submitted_at: new Date().toISOString(),
      });

      await this.saveMetadata();
      console.log(`[LocalWatcher] ✅ ${filename} → Job ${jobId}`);

      // Start polling for completion
      this.pollJobCompletion(filename, jobId);
    } catch (err) {
      console.error(`[LocalWatcher] ❌ Failed to submit ${filename}:`, err);
      this.metadata.set(filename, {
        path: promptPath,
        filename,
        status: 'failed',
        error: String(err),
        submitted_at: new Date().toISOString(),
      });
      await this.saveMetadata();
    } finally {
      this.isProcessing.delete(filename);
    }
  }

  private async pollJobCompletion(filename: string, jobId: string, attempts = 0) {
    const maxAttempts = 300; // 5 minutes with 1-second intervals
    const pollInterval = 1000;

    if (attempts >= maxAttempts) {
      console.warn(`[LocalWatcher] Job ${jobId} timed out after ${attempts} attempts`);
      return;
    }

    try {
      const response = await fetch(
        `${this.orchestratorUrl}/api/job-status/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.orchestratorToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const status = (await response.json()) as { status: string };

      if (status.status === 'completed' || status.status === 'failed') {
        const meta = this.metadata.get(filename);
        if (meta) {
          meta.status = status.status as 'completed' | 'failed';
          meta.completed_at = new Date().toISOString();
          this.metadata.set(filename, meta);
          await this.saveMetadata();
          console.log(`[LocalWatcher] Job ${jobId} ${status.status}`);
        }
      } else {
        // Still processing, poll again
        setTimeout(() => this.pollJobCompletion(filename, jobId, attempts + 1), pollInterval);
      }
    } catch (err) {
      console.error(`[LocalWatcher] Poll error for ${jobId}:`, err);
      // Continue polling despite error
      setTimeout(() => this.pollJobCompletion(filename, jobId, attempts + 1), pollInterval);
    }
  }

  async startWatching() {
    const watcher = watch(this.promptsDir, {
      ignored: [
        (path: string) => {
          const basename = path.split('/').pop() || '';
          return (
            basename.startsWith('.') ||
            basename === 'responses' ||
            basename === '.metadata.json' ||
            !basename.endsWith('.md')
          );
        },
      ],
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    watcher.on('add', async (filePath: string) => {
      const filename = path.basename(filePath);
      console.log(`[LocalWatcher] Detected new prompt: ${filename}`);

      try {
        const content = await fsp.readFile(filePath, 'utf-8');
        const { frontmatter, body } = this.parsePromptFile(content);
        await this.submitPrompt(filePath, filename, frontmatter, body);
      } catch (err) {
        console.error(`[LocalWatcher] Error processing ${filename}:`, err);
      }
    });

    watcher.on('error', (err) => {
      console.error('[LocalWatcher] Watcher error:', err);
    });

    console.log(`[LocalWatcher] Watching ${this.promptsDir} for changes...`);
  }
}

// Main
const cursorDir = process.argv.find((arg) => arg.startsWith('--cursor-dir='))?.split('=')[1] || '.cursor';
const orchestratorUrl =
  process.argv.find((arg) => arg.startsWith('--orchestrator-url='))?.split('=')[1] ||
  'http://localhost:3011';

const watcher = new LocalPromptWatcher({
  cursorDir,
  orchestratorUrl,
});

watcher
  .initialize()
  .then(() => watcher.startWatching())
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[LocalWatcher] Shutting down...');
  process.exit(0);
});
