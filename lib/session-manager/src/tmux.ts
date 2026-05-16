import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export function isDryRun(): boolean {
  return process.env.OPSLY_RUNTIME_DRY_RUN === 'true';
}

export function tmuxSessionName(sessionId: string): string {
  const safe = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
  return `opsly-${safe}`;
}

export async function tmuxHasSession(name: string): Promise<boolean> {
  if (isDryRun()) {
    return true;
  }
  try {
    await execFileAsync('tmux', ['has-session', '-t', name], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export async function tmuxListSessions(): Promise<string[]> {
  if (isDryRun()) {
    return ['opsly-dry-run'];
  }
  try {
    const { stdout } = await execFileAsync('tmux', ['list-sessions', '-F', '#{session_name}'], {
      timeout: 8000,
    });
    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

export async function tmuxNewSession(name: string, cwd: string, command?: string): Promise<void> {
  if (isDryRun()) {
    return;
  }
  const args = ['new-session', '-d', '-s', name, '-c', cwd];
  if (command && command.trim().length > 0) {
    args.push(command);
  }
  await execFileAsync('tmux', args, { timeout: 15000 });
}

export async function tmuxSendKeys(name: string, command: string): Promise<void> {
  if (isDryRun()) {
    return;
  }
  await execFileAsync('tmux', ['send-keys', '-t', name, command, 'Enter'], { timeout: 10000 });
}

export async function tmuxCapturePane(name: string, lines = 200): Promise<string> {
  if (isDryRun()) {
    return `[dry-run] pane output for ${name}\n`;
  }
  const { stdout } = await execFileAsync(
    'tmux',
    ['capture-pane', '-t', name, '-p', '-S', `-${lines}`],
    { timeout: 10000, maxBuffer: 2 * 1024 * 1024 }
  );
  return stdout;
}

export async function tmuxKillSession(name: string): Promise<void> {
  if (isDryRun()) {
    return;
  }
  await execFileAsync('tmux', ['kill-session', '-t', name], { timeout: 10000 });
}
