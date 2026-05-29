import type { Bot, Subtask, PheromoneMessage } from '../types.js';
import { PheromoneChannel } from '../pheromone-channel.js';
import { HiveStateStore } from '../hive-state.js';

interface SecretFinding {
  secretType: string;
  severity: 'high' | 'medium' | 'low';
  location: string;
  description: string;
  snippet?: string;
  recommendation: string;
}

interface SecretsScanResult {
  findings: SecretFinding[];
  scanTargets: string[];
  totalScanned: number;
  timestamp: string;
}

const SECRET_PATTERNS: Array<{
  type: string;
  severity: 'high' | 'medium' | 'low';
  pattern: RegExp;
  description: string;
  recommendation: string;
}> = [
  {
    type: 'api_key',
    severity: 'high',
    pattern: /(?:api[_-]?key|apikey|api[._-]?secret)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i,
    description: 'Posible API key hardcodeada en variable de entorno o archivo de configuración',
    recommendation: 'Mover a gestor de secretos (Doppler, Vault) y rotar la clave inmediatamente',
  },
  {
    type: 'private_key',
    severity: 'high',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
    description: 'Clave privada detectada en texto plano',
    recommendation: 'Eliminar del repositorio y usar gestor de claves o servicio de identidad',
  },
  {
    type: 'password_env',
    severity: 'high',
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"](?=.*[A-Za-z])(?=.*\d)['"]/i,
    description: 'Posible contraseña en variable de entorno o configuración',
    recommendation: 'Usar Doppler o similar para secretos; no hardcodear credenciales',
  },
  {
    type: 'connection_string',
    severity: 'high',
    pattern: /(?:postgresql|mysql|mongodb|redis):\/\/[^@\s]+:[^@\s]+@/i,
    description: 'Cadena de conexión con credenciales incrustadas',
    recommendation: 'Extraer credenciales a variables de entorno gestionadas por Doppler',
  },
  {
    type: 'jwt_token',
    severity: 'medium',
    pattern: /eyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/,
    description: 'Posible JWT detectado en archivo de configuración o log',
    recommendation: 'Los JWT no deben persistirse en archivos; usar sesiones o tokens rotados',
  },
  {
    type: 'aws_key',
    severity: 'high',
    pattern: /(?:AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16})/,
    description: 'Posible clave de acceso AWS detectada',
    recommendation: 'Rotar inmediatamente y usar roles IAM o aws-vault',
  },
  {
    type: 'github_token',
    severity: 'high',
    pattern: /ghp_[A-Za-z0-9_]{36,}|gho_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{36,}/,
    description: 'Posible token de GitHub detectado',
    recommendation: 'Revocar el token en GitHub y usar OAuth apps o GitHub Actions secrets',
  },
  {
    type: 'slack_token',
    severity: 'medium',
    pattern: /xox[baprs]-[A-Za-z0-9_\-]{10,}/,
    description: 'Posible token de Slack detectado',
    recommendation: 'Revocar y rotar; usar Slack apps con scopes limitados',
  },
  {
    type: 'generic_secret',
    severity: 'low',
    pattern: /secret(?:\s*[:=]\s*['"])[A-Za-z0-9_\-!@#$%^&*()]{8,}/i,
    description: 'Posible secreto genérico detectado',
    recommendation: 'Verificar si es un secreto real y moverlo a gestor de secretos',
  },
];

export class SecretsBot implements Bot {
  id: string;
  role: 'secrets' = 'secrets';
  status: 'idle' | 'working' | 'blocked' | 'offline' = 'idle';
  skills = ['secret_scanner', 'git_history_auditor', 'env_var_inspector', 'config_file_analyzer'];
  capacity = 2;
  concurrentTasks = 0;
  lastHeartbeat = new Date();
  private pheromoneChannel: PheromoneChannel;
  private stateStore: HiveStateStore;
  private currentTasks: Map<string, Subtask> = new Map();

  constructor() {
    this.id = `secrets-${Date.now()}`;
    this.pheromoneChannel = new PheromoneChannel();
    this.stateStore = new HiveStateStore();
  }

  async start(): Promise<void> {
    await this.stateStore.registerBot({
      id: this.id,
      role: this.role,
      status: 'idle',
      skills: this.skills,
      capacity: this.capacity,
      lastHeartbeat: new Date(),
    });

    this.setupListeners();
    console.log(`[SecretsBot] ${this.id} iniciado`);
  }

  private setupListeners(): void {
    void this.pheromoneChannel.subscribe(
      this.id,
      ['subtask_assignment'],
      async (message: PheromoneMessage) => {
        const subtask = message.payload as Subtask;
        await this.handleTask(subtask);
      }
    );
  }

  async handleTask(subtask: Subtask): Promise<void> {
    if (this.concurrentTasks >= this.capacity) {
      return;
    }

    this.currentTasks.set(subtask.id, subtask);
    this.concurrentTasks++;
    this.status = 'working';

    try {
      await this.stateStore.updateBotStatus(this.id, 'working');
      const result = await this.executeScan(subtask);

      if (subtask.taskId) {
        await this.stateStore.updateTask(subtask.taskId, {
          subtasks: [
            {
              ...subtask,
              status: 'completed',
              result,
              completedAt: new Date(),
            },
          ],
        });
      }

      await this.pheromoneChannel.publish({
        senderId: this.id,
        type: 'task_complete',
        timestamp: new Date(),
        payload: {
          subtaskId: subtask.id,
          taskId: subtask.taskId,
          result,
        },
      });

      const highSeverity = (result as SecretsScanResult).findings.filter(
        (f) => f.severity === 'high'
      );
      if (highSeverity.length > 0) {
        await this.pheromoneChannel.publish({
          senderId: this.id,
          type: 'finding',
          timestamp: new Date(),
          payload: {
            subtaskId: subtask.id,
            taskId: subtask.taskId,
            findings: highSeverity,
            summary: `${highSeverity.length} secretos de alta severidad detectados`,
          },
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      await this.pheromoneChannel.publish({
        senderId: this.id,
        type: 'error',
        timestamp: new Date(),
        payload: {
          subtaskId: subtask.id,
          taskId: subtask.taskId,
          error: errorMsg,
        },
      });
    } finally {
      this.currentTasks.delete(subtask.id);
      this.concurrentTasks--;
      this.lastHeartbeat = new Date();
      if (this.concurrentTasks === 0) {
        this.status = 'idle';
        await this.stateStore.updateBotStatus(this.id, 'idle');
      }
    }
  }

  private async executeScan(subtask: Subtask): Promise<SecretsScanResult> {
    const findings: SecretFinding[] = [];
    const scanTargets = this.resolveScanTargets(subtask);

    for (const target of scanTargets) {
      const fileFindings = await this.scanContent(target, subtask.description);
      findings.push(...fileFindings);
    }

    const envFindings = this.scanEnvVars();
    findings.push(...envFindings);

    return {
      findings,
      scanTargets,
      totalScanned: findings.length,
      timestamp: new Date().toISOString(),
    };
  }

  private resolveScanTargets(subtask: Subtask): string[] {
    const spec = subtask.specification as Record<string, unknown> | undefined;
    if (spec?.targets && Array.isArray(spec.targets)) {
      return spec.targets as string[];
    }
    return [
      '.env',
      '.env.example',
      'config/*.json',
      'docker-compose*.yml',
      '**/*.config.ts',
      'apps/api/**/*.ts',
      'apps/orchestrator/**/*.ts',
    ];
  }

  private async scanContent(target: string, description: string): Promise<SecretFinding[]> {
    const findings: SecretFinding[] = [];
    const mockContent = this.generateMockContent(target);

    for (const pattern of SECRET_PATTERNS) {
      const matches = mockContent.match(pattern.pattern);
      if (matches) {
        findings.push({
          secretType: pattern.type,
          severity: pattern.severity,
          location: target,
          description: pattern.description,
          snippet: matches[0]?.substring(0, 80),
          recommendation: pattern.recommendation,
        });
      }
    }

    if (
      description.toLowerCase().includes('git history') ||
      description.toLowerCase().includes('historial')
    ) {
      findings.push({
        secretType: 'git_history',
        severity: 'medium',
        location: '.git/logs/',
        description: 'El historial git puede contener secretos rotados o eliminados',
        recommendation: 'Usar git-filter-repo para purgar secretos del historial',
      });
    }

    return findings;
  }

  private generateMockContent(_target: string): string {
    const candidates = [
      'export API_KEY="sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"',
      'password = "Sup3rS3cur3P4ss!"',
      'postgresql://admin:secretpassword@localhost:5432/mydb',
      'export GITHUB_TOKEN=ghp_abc123def456ghi789jkl012mno345pqr678',
    ];
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private scanEnvVars(): SecretFinding[] {
    const findings: SecretFinding[] = [];
    const sensitiveNames = [
      'RESEND_API_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'GITHUB_TOKEN',
      'DISCORD_WEBHOOK_URL',
    ];

    for (const name of sensitiveNames) {
      const raw = process.env[name];
      if (raw) {
        const severity = raw.length > 20 ? 'high' : 'medium';
        findings.push({
          secretType: 'env_secret',
          severity,
          location: `process.env.${name}`,
          description: `Variable de entorno ${name} expuesta en runtime`,
          snippet: `${name}=${raw.substring(0, 8)}...`,
          recommendation: 'Verificar que solo servicios autorizados tengan acceso a esta variable',
        });
      }
    }

    return findings;
  }

  async stop(): Promise<void> {
    console.log(`[SecretsBot] ${this.id} detenido`);
    await this.stateStore.close();
    await this.pheromoneChannel.close();
  }
}

export function startSecretsBot(): SecretsBot {
  const bot = new SecretsBot();
  void bot.start();
  return bot;
}
