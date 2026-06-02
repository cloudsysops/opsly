import { access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { expandHome, loadLocalAutomationPolicy, loadLocalAutomationTools } from './registry';
import { isBrewInstallAllowed } from './permissions';
import type {
  AppStatus,
  BinaryStatus,
  ToolStatus,
  LocalAutomationTool,
  LocalAutomationPolicy,
} from './types';

const execFileAsync = promisify(execFile);
const EXEC_TIMEOUT_MS = 4_000;
const OUTPUT_LIMIT = 2_000;

async function safeExec(
  command: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync(command, args, {
    timeout: EXEC_TIMEOUT_MS,
    maxBuffer: 64 * 1024,
    env: {
      PATH: process.env.PATH ?? '',
      HOME: process.env.HOME ?? '',
      NODE_ENV: process.env.NODE_ENV ?? 'production',
    },
  });
  return {
    stdout: result.stdout.slice(0, OUTPUT_LIMIT).trim(),
    stderr: result.stderr.slice(0, OUTPUT_LIMIT).trim(),
  };
}

async function which(binary: string): Promise<string | null> {
  try {
    const { stdout } = await safeExec('/usr/bin/which', [binary]);
    return stdout.length > 0 ? stdout.split('\n')[0] : null;
  } catch {
    return null;
  }
}

async function binaryVersion(binary: string): Promise<{ version: string | null; error?: string }> {
  const versionArgsByBinary: Record<string, string[]> = {
    node: ['-v'],
    npm: ['-v'],
    pnpm: ['-v'],
    git: ['--version'],
    gh: ['--version'],
    python3: ['--version'],
    ffmpeg: ['-version'],
    docker: ['--version'],
    brew: ['--version'],
    ollama: ['--version'],
    code: ['--version'],
  };
  const args = versionArgsByBinary[binary] ?? ['--version'];
  try {
    const { stdout, stderr } = await safeExec(binary, args);
    const text = stdout || stderr;
    return { version: text.split('\n')[0] ?? null };
  } catch (error) {
    return { version: null, error: error instanceof Error ? error.message : String(error) };
  }
}

async function inspectBinary(binary: string): Promise<BinaryStatus> {
  const binPath = await which(binary);
  if (binPath === null) {
    return { name: binary, path: null, installed: false, version: null };
  }
  const version = await binaryVersion(binary);
  return {
    name: binary,
    path: binPath,
    installed: true,
    version: version.version,
    version_error: version.error,
  };
}

async function applicationPath(appName: string): Promise<string | null> {
  const candidates = [
    path.join('/Applications', appName),
    path.join(expandHome('~/Applications'), appName),
  ];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try next approved app directory only.
    }
  }
  return null;
}

async function isAppRunning(appName: string): Promise<boolean> {
  const processName = appName.replace(/\.app$/i, '');
  try {
    const { stdout } = await safeExec('/bin/ps', ['-axo', 'comm=']);
    return stdout
      .split('\n')
      .some((line) => line.includes(`/${processName}.app/`) || line.endsWith(`/${processName}`));
  } catch {
    return false;
  }
}

export async function listApplicationsDirectory(): Promise<AppStatus[]> {
  const config = await loadLocalAutomationTools();
  const appTools = Object.entries(config.tools).filter(
    ([, tool]) => typeof tool.app_name === 'string'
  );
  return Promise.all(
    appTools.map(async ([id, tool]) => {
      const appName = tool.app_name ?? id;
      const appPath = await applicationPath(appName);
      return {
        id,
        app_name: appName,
        path: appPath,
        installed: appPath !== null,
        running: appPath !== null ? await isAppRunning(appName) : false,
        brew_cask: tool.brew_cask,
      };
    })
  );
}

export async function listApplicationsSafe(): Promise<{
  generated_at: string;
  platform: NodeJS.Platform;
  applications_dir_readable: boolean;
  apps: AppStatus[];
}> {
  let applicationsDirReadable = false;
  try {
    await readdir('/Applications');
    applicationsDirReadable = true;
  } catch {
    applicationsDirReadable = false;
  }
  return {
    generated_at: new Date().toISOString(),
    platform: process.platform,
    applications_dir_readable: applicationsDirReadable,
    apps: await listApplicationsDirectory(),
  };
}

function isInstalled(
  binariesLength: number,
  appDefined: boolean,
  hasBinary: boolean,
  hasApp: boolean
): boolean {
  if (binariesLength > 0 && appDefined) {
    return hasBinary || hasApp;
  }
  if (binariesLength > 0) {
    return hasBinary;
  }
  return hasApp;
}

function getBrewKind(tool: LocalAutomationTool): 'formula' | 'cask' | null {
  if (tool.brew_formula) {
    return 'formula';
  }
  if (tool.brew_cask) {
    return 'cask';
  }
  return null;
}

function getBrewInstallAllowed(
  policy: LocalAutomationPolicy,
  brewPackage: string | null,
  brewKind: 'formula' | 'cask' | null
): boolean {
  if (brewPackage === null || brewKind === null) {
    return false;
  }
  return isBrewInstallAllowed(policy, brewKind, brewPackage);
}

async function buildToolStatus(
  id: string,
  tool: LocalAutomationTool,
  appByName: Map<string, AppStatus>,
  policy: LocalAutomationPolicy
): Promise<ToolStatus> {
  const binaries = await Promise.all((tool.binaries ?? []).map(inspectBinary));
  const app = appByName.get(id);
  const missing = [
    ...binaries.filter((binary) => !binary.installed).map((binary) => binary.name),
    ...(app && !app.installed ? [app.app_name] : []),
  ];
  const hasBinary = binaries.some((binary) => binary.installed);
  const hasApp = app?.installed === true;
  const installed = isInstalled(binaries.length, app !== undefined, hasBinary, hasApp);
  const brewPackage = tool.brew_formula ?? tool.brew_cask ?? null;
  const brewKind = getBrewKind(tool);

  return {
    id,
    type: tool.type,
    required: tool.required === true,
    installed,
    missing,
    binaries,
    app,
    install: {
      provider: brewPackage ? 'brew' : 'none',
      package: brewPackage,
      allowed: getBrewInstallAllowed(policy, brewPackage, brewKind),
      approval_required: true,
    },
  } satisfies ToolStatus;
}

export async function inspectRegisteredTools(): Promise<{
  generated_at: string;
  workspace_root: string;
  tools: ToolStatus[];
  missing_required: string[];
}> {
  const [config, policy, apps] = await Promise.all([
    loadLocalAutomationTools(),
    loadLocalAutomationPolicy(),
    listApplicationsDirectory(),
  ]);
  const appByName = new Map(apps.map((app) => [app.id, app]));
  const tools = await Promise.all(
    Object.entries(config.tools).map(([id, tool]) => buildToolStatus(id, tool, appByName, policy))
  );
  return {
    generated_at: new Date().toISOString(),
    workspace_root: config.workspace_root,
    tools,
    missing_required: tools
      .filter((tool) => tool.required && !tool.installed)
      .map((tool) => tool.id),
  };
}
