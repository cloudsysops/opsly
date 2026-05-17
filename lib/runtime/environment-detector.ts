/**
 * Environment Detector - Local-First Runtime
 * Detecta capabilities del entorno local para ejecución de agentes
 */

import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface SystemResources {
  cpuCores: number;
  cpuModel: string;
  memoryGB: number;
  memoryUsedGB: number;
  diskGB: number;
  diskFreeGB: number;
  loadAverage: number[];
}

export interface AgentDetection {
  name: string;
  installed: boolean;
  path?: string;
  version?: string;
  executable?: string;
}

export interface OllamaInfo {
  installed: boolean;
  running: boolean;
  url?: string;
  models: string[];
  defaultModel?: string;
}

export interface ToolDetection {
  hasNode: boolean;
  nodeVersion?: string;
  hasNpm: boolean;
  npmVersion?: string;
  hasPython: boolean;
  pythonVersion?: string;
  hasDocker: boolean;
  dockerRunning: boolean;
  dockerVersion?: string;
  hasGit: boolean;
  gitVersion?: string;
}

export interface EnvironmentCapabilities {
  os: 'macos' | 'linux' | 'windows' | 'wasm' | 'unknown';
  osVersion: string;
  arch: string;
  hostname: string;
  agents: {
    cursor: AgentDetection;
    claude: AgentDetection;
    codex: AgentDetection;
    opencode: AgentDetection;
  };
  ollama: OllamaInfo;
  tools: ToolDetection;
  resources: SystemResources;
  recommendedAgent: 'cursor' | 'claude' | 'codex' | 'opencode' | 'ollama' | 'remote';
  confidence: number;
  timestamp: string;
}

export interface HealthCheckResult {
  healthy: boolean;
  cpuOk: boolean;
  memoryOk: boolean;
  diskOk: boolean;
  ollamaOk: boolean;
  agentsAvailable: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Detectar SO completo
 */
function runSync(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim();
  } catch {
    return '';
  }
}

function detectOS(): { os: EnvironmentCapabilities['os']; version: string; arch: string } {
  const platform = process.platform;
  let osType: EnvironmentCapabilities['os'] = 'unknown';
  let osVersion = 'unknown';
  let arch = os.arch();

  switch (platform) {
    case 'darwin':
      osType = 'macos';
      osVersion = runSync('sw_vers -productVersion') || 'unknown';
      break;
    case 'linux':
      osType = 'linux';
      try {
        const rel = fs.readFileSync('/etc/os-release', 'utf-8');
        const match = rel.match(/PRETTY_NAME="?([^"\n]+)"?/);
        osVersion = match ? match[1] : 'Linux';
      } catch {
        osVersion = 'Linux';
      }
      break;
    case 'win32':
      osType = 'windows';
      const verOut = runSync('ver');
      const match = verOut.match(/[\d.]+/);
      osVersion = match ? match[0] : 'Windows';
      break;
  }

  return { os: osType, version: osVersion, arch };
}

/**
 * Helper para ejecutar comandos
 */
async function runCommand(cmd: string, timeout = 5000): Promise<string> {
  try {
    const { stdout } = await execAsync(cmd, { timeout, encoding: 'utf-8' });
    return stdout.trim();
  } catch {
    return '';
  }
}

/**
 * Detectar Cursor
 */
async function detectCursor(): Promise<AgentDetection> {
  const platform = process.platform;
  const possiblePaths = platform === 'darwin'
    ? ['/Applications/Cursor.app/Contents/MacOS/Cursor', '~/Library/Application Support/Cursor/Code/Cursor']
    : platform === 'linux'
    ? ['/usr/bin/cursor', '~/.cursor/.../cursor']
    : ['C:\\Program Files\\Cursor\\Cursor.exe', '%LOCALAPPDATA%\\Programs\\Cursor\\Cursor.exe'];

  const name = 'cursor';

  // Check if command exists
  const cmdExists = runSync(`which ${name} 2>/dev/null || command -v ${name} 2>/dev/null || echo ""`);

  for (const path of possiblePaths) {
    try {
      const expanded = path.replace('~', os.homedir()).replace('%LOCALAPPDATA%', process.env.LOCALAPPDATA || '');
      if (fs.existsSync(expanded)) {
        return { name, installed: true, path: expanded };
      }
    } catch { /* ignore */ }
  }

  return { name, installed: !!cmdExists, executable: cmdExists || undefined };
}

/**
 * Detectar Claude (CLI)
 */
async function detectClaude(): Promise<AgentDetection> {
  const name = 'claude';

  // Check for claude CLI
  const cliPath = await runCommand(`which claude 2>/dev/null || which claude-cli 2>/dev/null || echo ""`);

  // Check for Claude app (macOS)
  const appPaths = [
    '/Applications/Claude.app',
    '~/Library/Application Support/Claude',
  ];

  for (const path of appPaths) {
    const expanded = path.replace('~', os.homedir());
    if (fs.existsSync(expanded)) {
      return { name, installed: true, path: expanded };
    }
  }

  return { name, installed: !!cliPath, executable: cliPath || undefined };
}

/**
 * Detectar Codex
 */
async function detectCodex(): Promise<AgentDetection> {
  const name = 'codex';
  const cliPath = await runCommand(`which codex 2>/dev/null || echo ""`);
  return { name, installed: !!cliPath, executable: cliPath || undefined };
}

/**
 * Detectar OpenCode
 */
async function detectOpenCode(): Promise<AgentDetection> {
  const name = 'opencode';
  const cliPath = await runCommand(`which opencode 2>/dev/null || echo ""`);
  return { name, installed: !!cliPath, executable: cliPath || undefined };
}

/**
 * Detectar todos los agentes
 */
async function detectAgents(): Promise<EnvironmentCapabilities['agents']> {
  const [cursor, claude, codex, opencode] = await Promise.all([
    detectCursor(),
    detectClaude(),
    detectCodex(),
    detectOpenCode(),
  ]);

  return { cursor, claude, codex, opencode };
}

/**
 * Detectar Ollama
 */
async function detectOllama(): Promise<OllamaInfo> {
  const ollamaInstalled = await runCommand('which ollama 2>/dev/null || echo ""');

  if (!ollamaInstalled) {
    return { installed: false, running: false, models: [] };
  }

  // Check if running
  let running = false;
  let models: string[] = [];

  try {
    const listResult = await runCommand('ollama list 2>/dev/null || ollama ps 2>/dev/null || echo ""', 10000);
    running = listResult.length > 0;

    // Parse models
    const lines = listResult.split('\n').filter(l => l.trim() && !l.includes('NAME') && !l.includes('---'));
    models = lines.map(l => l.split(/\s+/)[0]).filter(Boolean);
  } catch { /* ignore */ }

  return {
    installed: true,
    running,
    url: 'http://localhost:11434',
    models,
    defaultModel: models[0],
  };
}

/**
 * Detectar herramientas de desarrollo
 */
async function detectTools(): Promise<ToolDetection> {
  const [nodeVer, npmVer, pythonVer, dockerVer, gitVer] = await Promise.all([
    runCommand('node --version 2>/dev/null || echo ""'),
    runCommand('npm --version 2>/dev/null || echo ""'),
    runCommand('python3 --version 2>/dev/null || python --version 2>/dev/null || echo ""'),
    runCommand('docker --version 2>/dev/null || echo ""'),
    runCommand('git --version 2>/dev/null || echo ""'),
  ]);

  let dockerRunning = false;
  if (dockerVer) {
    try {
      await runCommand('docker info 2>/dev/null | head -1 || echo ""');
      dockerRunning = true;
    } catch { /* ignore */ }
  }

  return {
    hasNode: !!nodeVer,
    nodeVersion: nodeVer.replace('v', ''),
    hasNpm: !!npmVer,
    npmVersion: npmVer,
    hasPython: !!pythonVer,
    pythonVersion: pythonVer.replace('Python ', ''),
    hasDocker: !!dockerVer,
    dockerRunning,
    dockerVersion: dockerVer.replace('Docker version ', '').split(',')[0],
    hasGit: !!gitVer,
    gitVersion: gitVer.replace('git version ', ''),
  };
}

/**
 * Obtener recursos del sistema
 */
function getSystemResources(): SystemResources {
  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model || 'unknown';
  const cpuCores = cpus.length;

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memoryGB = Math.round(totalMem / (1024 ** 3));
  const memoryUsedGB = Math.round((totalMem - freeMem) / (1024 ** 3));

  // Disk - approximate (would need platform-specific for accurate)
  let diskGB = 0;
  let diskFreeGB = 0;

  try {
    if (process.platform !== 'win32') {
      const stat = fs.statfsSync('/');
      diskGB = Math.round((stat.bsize * stat.blocks) / (1024 ** 3));
      diskFreeGB = Math.round((stat.bsize * stat.bfree) / (1024 ** 3));
    }
  } catch { /* ignore */ }

  const loadAverage = os.loadavg();

  return {
    cpuCores,
    cpuModel: cpuModel.replace(/  +/g, ' ').trim(),
    memoryGB,
    memoryUsedGB,
    diskGB,
    diskFreeGB,
    loadAverage: [Math.round(loadAverage[0] * 100) / 100, Math.round(loadAverage[1] * 100) / 100, Math.round(loadAverage[2] * 100) / 100],
  };
}

/**
 * Seleccionar agente recomendado basado en capabilities
 */
function selectRecommendedAgent(
  agents: EnvironmentCapabilities['agents'],
  ollama: OllamaInfo,
  resources: SystemResources
): EnvironmentCapabilities['recommendedAgent'] {
  // Priority: local agents > ollama > remote
  const scores = {
    cursor: 0,
    claude: 0,
    codex: 0,
    opencode: 0,
    ollama: 0,
    remote: 0,
  };

  // Agent scores
  if (agents.cursor.installed) scores.cursor = 100;
  if (agents.claude.installed) scores.claude = 90;
  if (agents.codex.installed) scores.codex = 80;
  if (agents.opencode.installed) scores.opencode = 70;

  // Ollama bonus
  if (ollama.installed && ollama.running && ollama.models.length > 0) {
    scores.ollama = 60;
  }

  // Resource-based adjustment
  if (resources.memoryGB < 8) {
    scores.ollama += 20;
    scores.cursor -= 10;
  }

  if (resources.cpuCores < 2) {
    scores.ollama += 30;
  }

  // Find highest
  const max = Object.entries(scores).reduce((a, b) => b[1] > a[1] ? b : a);
  return max[0] as EnvironmentCapabilities['recommendedAgent'];
}

/**
 * Calcular confidence de la detección
 */
function calculateConfidence(
  agents: EnvironmentCapabilities['agents'],
  ollama: OllamaInfo,
  tools: ToolDetection,
  resources: SystemResources
): number {
  let score = 0;
  let total = 10;

  if (agents.cursor.installed) score++;
  if (agents.claude.installed) score++;
  if (ollama.installed) score++;
  if (ollama.running) score++;
  if (tools.hasNode) score++;
  if (tools.hasDocker) score++;
  if (resources.cpuCores > 0) score++;
  if (resources.memoryGB > 0) score++;
  if (resources.diskGB > 0) score++;
  if (resources.diskFreeGB > 0) score++;

  return Math.round((score / total) * 100) / 100;
}

/**
 * Función principal: detectar el entorno completo
 */
export async function detectEnvironment(): Promise<EnvironmentCapabilities> {
  const [osInfo, agents, ollama, tools, resources] = await Promise.all([
    Promise.resolve(detectOS()),
    detectAgents(),
    detectOllama(),
    detectTools(),
    Promise.resolve(getSystemResources()),
  ]);

  const recommendedAgent = selectRecommendedAgent(agents, ollama, resources);
  const confidence = calculateConfidence(agents, ollama, tools, resources);

  return {
    os: osInfo.os,
    osVersion: osInfo.version,
    arch: osInfo.arch,
    hostname: os.hostname(),
    agents,
    ollama,
    tools,
    resources,
    recommendedAgent,
    confidence,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Health check del entorno local
 */
export async function healthCheck(): Promise<HealthCheckResult> {
  const env = await detectEnvironment();

  const result: HealthCheckResult = {
    healthy: true,
    cpuOk: true,
    memoryOk: true,
    diskOk: true,
    ollamaOk: true,
    agentsAvailable: [],
    warnings: [],
    errors: [],
  };

  // CPU check
  const load = env.resources.loadAverage[0];
  const cores = env.resources.cpuCores;
  if (load > cores * 0.8) {
    result.cpuOk = false;
    result.warnings.push(`High CPU load: ${load} (${cores} cores)`);
  }

  // Memory check
  const memPercent = (env.resources.memoryUsedGB / env.resources.memoryGB) * 100;
  if (memPercent > 90) {
    result.memoryOk = false;
    result.errors.push(`Memory critical: ${Math.round(memPercent)}% used`);
    result.healthy = false;
  } else if (memPercent > 75) {
    result.warnings.push(`Memory high: ${Math.round(memPercent)}% used`);
  }

  // Disk check
  const diskPercent = ((env.resources.diskGB - env.resources.diskFreeGB) / env.resources.diskGB) * 100;
  if (diskPercent > 90) {
    result.diskOk = false;
    result.errors.push(`Disk critical: ${Math.round(diskPercent)}% used`);
    result.healthy = false;
  } else if (diskPercent > 80) {
    result.warnings.push(`Disk low: ${Math.round(diskPercent)}% used`);
  }

  // Ollama check
  if (env.ollama.installed && !env.ollama.running) {
    result.ollamaOk = false;
    result.warnings.push('Ollama installed but not running');
  }

  // Agents available
  if (env.agents.cursor.installed) result.agentsAvailable.push('cursor');
  if (env.agents.claude.installed) result.agentsAvailable.push('claude');
  if (env.agents.codex.installed) result.agentsAvailable.push('codex');
  if (env.agents.opencode.installed) result.agentsAvailable.push('opencode');

  if (result.agentsAvailable.length === 0 && !env.ollama.running) {
    result.healthy = false;
    result.errors.push('No local agents available');
  }

  return result;
}

export default { detectEnvironment, healthCheck };