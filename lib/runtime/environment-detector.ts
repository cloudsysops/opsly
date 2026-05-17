/**
 * Environment Detector
 * Week 1: Detecta capabilities del entorno local
 * TODO: Implementar detection por OS (macOS/Linux/Windows/WASM)
 * TODO: Health checks para recursos locales (CPU, RAM, Disk)
 * TODO: Agregar detection de tools disponibles
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface EnvironmentCapabilities {
  os: 'macos' | 'linux' | 'windows' | 'wasm' | 'unknown';
  osVersion?: string;
  hasCursor: boolean;
  hasClaude: boolean;
  hasCodex: boolean;
  hasOpenCode: boolean;
  hasOllama: boolean;
  ollamaModels?: string[];
  hasDocker: boolean;
  hasNode: boolean;
  nodeVersion?: string;
  hasPython: boolean;
  pythonVersion?: string;
  cpuCores: number;
  memoryGB: number;
  diskGB: number;
  recommendedAgent: 'cursor' | 'claude' | 'codex' | 'opencode' | 'ollama' | 'remote';
  confidence: number; // 0-1
}

/**
 * Detecta el sistema operativo
 * TODO: Agregar detección de versión
 */
function detectOS(): EnvironmentCapabilities['os'] {
  const platform = process.platform;
  if (platform === 'darwin') return 'macos';
  if (platform === 'linux') return 'linux';
  if (platform === 'win32') return 'windows';
  // TODO: detectar WASM
  return 'unknown';
}

/**
 * Verifica si un comando está disponible
 * TODO: Implementar con which/where
 */
async function checkCommand(command: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`which ${command}`);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Detecta agentes locales instalados
 * TODO: Agregar detección de versiones
 */
async function detectLocalAgents(): Promise<Pick<EnvironmentCapabilities, 'hasCursor' | 'hasClaude' | 'hasCodex' | 'hasOpenCode'>> {
  // TODO: Implementar detección por platform
  // macOS: /Applications/Cursor.app, ~/Library/Application Support/Claude
  // Linux: ~/.cursor, ~/.claude
  // Windows: %LOCALAPPDATA%/Cursor, %APPDATA%/Claude

  return {
    hasCursor: await checkCommand('cursor') || await checkCommand('/Applications/Cursor.app'),
    hasClaude: await checkCommand('claude') || await checkCommand('anthropic'),
    hasCodex: await checkCommand('codex'),
    hasOpenCode: await checkCommand('opencode'),
  };
}

/**
 * Detecta Ollama y modelos disponibles
 */
async function detectOllama(): Promise<Pick<EnvironmentCapabilities, 'hasOllama' | 'ollamaModels'>> {
  const hasOllama = await checkCommand('ollama');

  if (!hasOllama) {
    return { hasOllama: false, ollamaModels: undefined };
  }

  // TODO: Verificar si Ollama está corriendo y obtener modelos
  try {
    const { stdout } = await execAsync('ollama list --json 2>/dev/null || echo "[]"');
    const models = JSON.parse(stdout || '[]');
    return { hasOllama: true, ollamaModels: models.map((m: { name: string }) => m.name) };
  } catch {
    return { hasOllama: true, ollamaModels: [] };
  }
}

/**
 * Detecta herramientas de desarrollo
 */
async function detectDevTools(): Promise<Pick<EnvironmentCapabilities, 'hasDocker' | 'hasNode' | 'nodeVersion' | 'hasPython' | 'pythonVersion'>> {
  const [hasDocker, hasNode, hasPython] = await Promise.all([
    checkCommand('docker'),
    checkCommand('node'),
    checkCommand('python3') || checkCommand('python'),
  ]);

  let nodeVersion: string | undefined;
  let pythonVersion: string | undefined;

  if (hasNode) {
    try {
      const { stdout } = await execAsync('node --version');
      nodeVersion = stdout.trim();
    } catch { /* ignore */ }
  }

  if (hasPython) {
    try {
      const { stdout } = await execAsync('python3 --version || python --version');
      pythonVersion = stdout.trim();
    } catch { /* ignore */ }
  }

  return { hasDocker, hasNode, nodeVersion, hasPython, pythonVersion };
}

/**
 * Obtiene recursos del sistema
 * TODO: Implementar con os.totalmem(), os.cpus()
 */
function getSystemResources(): Pick<EnvironmentCapabilities, 'cpuCores' | 'memoryGB' | 'diskGB'> {
  // TODO: Implementar con os.totalmem() / (1024^3) para memoria
  // TODO: usar os.cpus().length para cores
  // TODO: verificar espacio en disco con fs.statfs()

  const os = require('os');
  return {
    cpuCores: os.cpus().length,
    memoryGB: Math.round(os.totalmem() / (1024 ** 3)),
    diskGB: 0, // TODO: implementar
  };
}

/**
 * Selecciona el agente recomendado basado en capabilities
 */
function selectRecommendedAgent(caps: Partial<EnvironmentCapabilities>): EnvironmentCapabilities['recommendedAgent'] {
  // TODO: Implementar lógica de selección basada en:
  // 1. Disponibilidad de agentes locales
  // 2. Recursos disponibles (RAM)
  // 3. Modelo Ollama disponible

  if (caps.hasCursor) return 'cursor';
  if (caps.hasClaude) return 'claude';
  if (caps.hasOllama) return 'ollama';
  if (caps.hasCodex) return 'codex';
  if (caps.hasOpenCode) return 'opencode';

  return 'remote';
}

/**
 * Calcula confidence de la detección
 */
function calculateConfidence(caps: Partial<EnvironmentCapabilities>): number {
  // TODO: Implementar cálculo de confidence
  // Basado en cuántos checks pudieron completar

  let score = 0;
  let total = 0;

  if (caps.os !== 'unknown') { score++; }
  total++;
  if (caps.hasCursor !== undefined) { score++; }
  total++;
  if (caps.hasOllama !== undefined) { score++; }
  total++;
  if (caps.cpuCores) { score++; }
  total++;

  return total > 0 ? score / total : 0;
}

/**
 * Función principal: detecta el entorno completo
 * TODO: Agregar caching de resultados
 * TODO: Agregar retry logic para comandos que fallan
 */
export async function detectEnvironment(): Promise<EnvironmentCapabilities> {
  const [agents, ollama, devTools, resources] = await Promise.all([
    detectLocalAgents(),
    detectOllama(),
    detectDevTools(),
    getSystemResources(),
  ]);

  const partial = {
    os: detectOS(),
    ...agents,
    ...ollama,
    ...devTools,
    ...resources,
  };

  return {
    ...partial,
    recommendedAgent: selectRecommendedAgent(partial),
    confidence: calculateConfidence(partial),
  };
}

export default { detectEnvironment };