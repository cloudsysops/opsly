import { readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { watch } from 'node:fs';
import { HelpRequestSystem, ensureHelpRequestDirectories } from './help-request-system.js';

export class CursorCopilotBridge {
  private readonly promptsDir = resolve(process.cwd(), '.cursor/prompts');
  private readonly responsesDir = resolve(process.cwd(), '.cursor/responses');
  private readonly helpSystem = new HelpRequestSystem();
  private watcher: ReturnType<typeof watch> | null = null;

  async start(): Promise<void> {
    await ensureHelpRequestDirectories();
    if (this.watcher) {
      return;
    }
    this.watcher = watch(this.responsesDir, (eventType, filename) => {
      if (eventType === 'rename' && filename?.endsWith('.response')) {
        void this.processExternalResponse(filename);
      }
    });
    console.log('[orchestrator] CursorCopilotBridge enabled');
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  async sendPromptToCursor(prompt: string, prefix = 'opsly-prompt'): Promise<string> {
    await ensureHelpRequestDirectories();
    const id = `${prefix}-${Date.now()}`;
    const promptFile = join(this.promptsDir, `${id}.md`);
    await writeFile(promptFile, prompt, 'utf-8');
    return promptFile;
  }

  private async processExternalResponse(filename: string): Promise<void> {
    const filePath = join(this.responsesDir, filename);
    try {
      const resolution = await readFile(filePath, 'utf-8');
      const base = basename(filename, '.response');
      const helpId = base.includes('help-') ? base.slice(base.indexOf('help-')) : base;
      await this.helpSystem.resolveHelpRequest(helpId, resolution.trim(), 'cursor');
      console.log(`[orchestrator] external response processed: ${filename}`);
    } catch (error) {
      console.error('[orchestrator] processExternalResponse failed', error);
    }
  }
}
