#!/usr/bin/env node

/**
 * IterationResponseWatcher
 *
 * Monitors .cursor/responses/ for validation results
 * Automatically generates retry prompts when validation fails
 * Escalates to help-request when max attempts exceeded
 *
 * Usage:
 *   npx tsx scripts/iteration-watch-responses.ts [--cursor-dir .cursor]
 *
 * Environment variables:
 *   CURSOR_DIR - .cursor directory path (default: .cursor)
 */

import { promises as fsp } from 'fs';
import * as path from 'path';
import { watch } from 'chokidar';
import { IterationManager } from '../apps/orchestrator/src/lib/iteration-manager';

interface ProcessedValidation {
  jobId: string;
  responsePath: string;
  processedAt: string;
}

class IterationResponseWatcher {
  private cursorDir: string;
  private responsesDir: string;
  private promptsDir: string;
  private iterationManager: IterationManager;
  private processedValidations = new Set<string>();

  constructor(cursorDir: string = '.cursor') {
    this.cursorDir = cursorDir;
    this.responsesDir = path.join(cursorDir, 'responses');
    this.promptsDir = path.join(cursorDir, 'prompts');
    this.iterationManager = new IterationManager(cursorDir);
  }

  private async getOriginalPrompt(jobId: string): Promise<string> {
    // Try to find the original prompt in metadata
    const metadataPath = path.join(this.promptsDir, '.metadata.json');

    try {
      const metadata = await fsp.readFile(metadataPath, 'utf-8');
      const data = JSON.parse(metadata) as Record<
        string,
        {
          jobId?: string;
          filename?: string;
        }
      >;

      // Find the prompt file matching this job
      for (const [filename, entry] of Object.entries(data)) {
        if (entry.jobId === jobId) {
          const promptPath = path.join(this.promptsDir, filename);
          try {
            const content = await fsp.readFile(promptPath, 'utf-8');
            // Extract body from frontmatter
            const lines = content.split('\n');
            let bodyStart = 0;
            if (lines[0]?.trim() === '---') {
              for (let i = 1; i < lines.length; i++) {
                if (lines[i]?.trim() === '---') {
                  bodyStart = i + 1;
                  break;
                }
              }
            }
            return lines.slice(bodyStart).join('\n').trim();
          } catch {
            // Ignore, use default
          }
        }
      }
    } catch {
      // Ignore, use default
    }

    return 'Refactor the code to fix validation errors';
  }

  async processValidationResult(filePath: string): Promise<void> {
    const filename = path.basename(filePath);

    // Only process validation.json files
    if (!filename.endsWith('.validation.json')) {
      return;
    }

    // Skip if already processed
    if (this.processedValidations.has(filename)) {
      return;
    }
    this.processedValidations.add(filename);

    try {
      console.log(
        `[IterationWatcher] Processing validation: ${filename}`,
      );

      // Read validation report
      const content = await fsp.readFile(filePath, 'utf-8');
      const validation = JSON.parse(content);

      const jobId = validation.job_id;
      const attempt = validation.attempt || 1;

      // Get original prompt for context
      const originalPrompt = await this.getOriginalPrompt(jobId);

      // Process validation result
      const result = await this.iterationManager.processValidationResult(
        filePath.replace('.validation.json', '.md'),
        originalPrompt,
      );

      console.log(`[IterationWatcher] Job ${jobId} (attempt ${attempt}): ${result.action}`);
      console.log(`[IterationWatcher] Reason: ${result.reason}`);

      if (result.action === 'commit') {
        console.log(`[IterationWatcher] ✅ Ready for commit`);
      } else if (result.action === 'iterate') {
        console.log(
          `[IterationWatcher] 🔄 Generated retry prompt: ${result.nextPromptPath}`,
        );
        console.log(
          `[IterationWatcher] LocalPromptWatcher will detect and resubmit automatically`,
        );
      } else if (result.action === 'escalate') {
        console.log(
          `[IterationWatcher] ⚠️ Escalating to help request: ${result.reason}`,
        );
        // TODO: Create help request when HelpRequestSystem integrated
      }
    } catch (err) {
      console.error(
        `[IterationWatcher] Error processing ${filename}:`,
        err,
      );
    }
  }

  async start(): Promise<void> {
    // Ensure directories exist
    try {
      await fsp.mkdir(this.responsesDir, { recursive: true });
      await fsp.mkdir(this.promptsDir, { recursive: true });
    } catch (err) {
      console.error('[IterationWatcher] Failed to create directories:', err);
    }

    console.log(
      `[IterationWatcher] Starting, watching ${this.responsesDir}`,
    );

    const watcher = watch(`${this.responsesDir}/*.validation.json`, {
      persistent: true,
      ignored: ['**/.*', '**/*.md'],
    });

    watcher.on('add', (filePath: string) => {
      void this.processValidationResult(filePath);
    });

    watcher.on('error', (err: unknown) => {
      console.error('[IterationWatcher] Watcher error:', err);
    });

    console.log(
      '[IterationWatcher] Ready. Monitoring validation results...',
    );
  }
}

async function main(): Promise<void> {
  const cursorDir = process.env.CURSOR_DIR || '.cursor';

  const watcher = new IterationResponseWatcher(cursorDir);
  await watcher.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('[IterationWatcher] Shutting down...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('[IterationWatcher] Shutting down...');
    process.exit(0);
  });
}

void main().catch((err) => {
  console.error('[IterationWatcher] Fatal error:', err);
  process.exit(1);
});
