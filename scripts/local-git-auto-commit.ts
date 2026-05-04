#!/usr/bin/env node
import { execSync, spawn } from 'child_process';
import { promises as fsp } from 'fs';
import * as path from 'path';
import { watch } from 'chokidar';

interface GitAutoCommitOptions {
  watchDir: string;
  workingDir: string;
  autoPush?: boolean;
}

class LocalGitAutoCommit {
  private watchDir: string;
  private workingDir: string;
  private autoPush: boolean;
  private committedFiles = new Set<string>();

  constructor(options: GitAutoCommitOptions) {
    this.watchDir = options.watchDir;
    this.workingDir = options.workingDir;
    this.autoPush = options.autoPush ?? true;
  }

  private extractJobId(filename: string): string {
    // response-{job_id}.md format
    const match = filename.match(/response-(.+)\.md$/);
    return match ? match[1] : filename;
  }

  private async parseResponse(filePath: string): Promise<{
    jobId: string;
    agentRole?: string;
    summary?: string;
  }> {
    try {
      const content = await fsp.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      let jobId = '';
      let agentRole = '';
      let summary = '';

      // Parse header or metadata in response file
      for (const line of lines) {
        if (line.includes('job_id:') || line.includes('Job ID:')) {
          jobId = line.split(':')[1]?.trim() || '';
        }
        if (line.includes('agent_role:') || line.includes('Agent Role:')) {
          agentRole = line.split(':')[1]?.trim() || '';
        }
        if (line.includes('Summary:')) {
          summary = lines[lines.indexOf(line) + 1]?.trim() || '';
          break;
        }
      }

      // Fallback: extract from filename
      if (!jobId) {
        jobId = this.extractJobId(path.basename(filePath));
      }

      return { jobId, agentRole, summary };
    } catch (err) {
      console.error(`Error parsing response file ${filePath}:`, err);
      return { jobId: this.extractJobId(path.basename(filePath)) };
    }
  }

  private async getCurrentBranch(): Promise<string> {
    try {
      const branch = execSync('git branch --show-current', {
        cwd: this.workingDir,
        encoding: 'utf-8',
      }).trim();
      return branch;
    } catch (err) {
      console.error('Error getting current branch:', err);
      return 'unknown';
    }
  }

  private async commitAndPush(filePath: string, jobId: string, agentRole?: string) {
    try {
      const fileName = path.basename(filePath);

      // Add file to git
      execSync(`git add "${fileName}"`, {
        cwd: path.dirname(filePath),
        stdio: 'pipe',
      });

      // Create meaningful commit message
      const agentLabel = agentRole ? `[${agentRole}]` : '';
      const commitMessage = `feat(job-${jobId}): ${agentLabel} agent response completed`;

      // Commit
      execSync(`git commit -m "${commitMessage}"`, {
        cwd: this.workingDir,
        stdio: 'pipe',
      });

      console.log(`[AutoCommit] ✅ Committed: ${fileName}`);

      // Push if enabled
      if (this.autoPush) {
        const branch = await this.getCurrentBranch();
        if (branch !== 'unknown') {
          execSync(`git push origin ${branch}`, {
            cwd: this.workingDir,
            stdio: 'pipe',
          });
          console.log(`[AutoCommit] ✅ Pushed to origin/${branch}`);
        }
      }

      this.committedFiles.add(fileName);
    } catch (err) {
      console.error(`[AutoCommit] Error committing ${filePath}:`, err);
    }
  }

  async startWatching() {
    const watcher = watch(this.watchDir, {
      ignored: [
        (path: string) => {
          const basename = path.split('/').pop() || '';
          return basename.startsWith('.') || !basename.endsWith('.md');
        },
      ],
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100,
      },
    });

    watcher.on('add', async (filePath: string) => {
      const filename = path.basename(filePath);

      if (this.committedFiles.has(filename)) {
        return;
      }

      console.log(`[AutoCommit] Detected response: ${filename}`);

      try {
        // Wait a bit for file to be fully written
        await new Promise((resolve) => setTimeout(resolve, 500));

        const { jobId, agentRole } = await this.parseResponse(filePath);
        await this.commitAndPush(filePath, jobId, agentRole);
      } catch (err) {
        console.error(`[AutoCommit] Error processing ${filename}:`, err);
      }
    });

    watcher.on('error', (err) => {
      console.error('[AutoCommit] Watcher error:', err);
    });

    console.log(`[AutoCommit] Watching ${this.watchDir} for responses...`);
  }
}

// Main
const watchDir =
  process.argv.find((arg) => arg.startsWith('--watch-dir='))?.split('=')[1] ||
  path.join(process.cwd(), '.cursor', 'responses');

const workingDir =
  process.argv.find((arg) => arg.startsWith('--working-dir='))?.split('=')[1] || process.cwd();

const autoPush =
  !process.argv.includes('--no-push');

const commit = new LocalGitAutoCommit({
  watchDir,
  workingDir,
  autoPush,
});

commit.startWatching().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[AutoCommit] Shutting down...');
  process.exit(0);
});
