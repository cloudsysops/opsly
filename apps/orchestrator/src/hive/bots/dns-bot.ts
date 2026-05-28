import type { Bot, Subtask, PheromoneMessage } from '../types.js';
import { PheromoneChannel } from '../pheromone-channel.js';
import { HiveStateStore } from '../hive-state.js';

interface DnsFinding {
  domain: string;
  checkType: 'expiry' | 'dns_change' | 'suspicious_record';
  status: 'ok' | 'warning' | 'critical';
  detail: string;
  daysRemaining?: number;
  recordsChanged?: string[];
  riskLevel?: string;
}

interface DnsScanResult {
  findings: DnsFinding[];
  domainsChecked: number;
  timestamp: string;
}

export class DnsBot implements Bot {
  id: string;
  role: 'dns' = 'dns';
  status: 'idle' | 'working' | 'blocked' | 'offline' = 'idle';
  skills = [
    'domain_expiry_checker',
    'dns_record_monitor',
    'phishing_detector',
    'spoofing_analyzer',
  ];
  capacity = 2;
  concurrentTasks = 0;
  lastHeartbeat = new Date();
  private pheromoneChannel: PheromoneChannel;
  private stateStore: HiveStateStore;
  private currentTasks: Map<string, Subtask> = new Map();
  private knownDomains: string[] = [];

  constructor() {
    this.id = `dns-${Date.now()}`;
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

    this.knownDomains = await this.loadDomains();
    this.setupListeners();
    console.log(`[DnsBot] ${this.id} iniciado con ${this.knownDomains.length} dominios conocidos`);
  }

  private async loadDomains(): Promise<string[]> {
    return [
      'op-sly.com',
      'peskids.op-sly.com',
      'api.op-sly.com',
      'admin.op-sly.com',
      'portal.op-sly.com',
    ];
  }

  private setupListeners(): void {
    void this.pheromoneChannel.subscribe(this.id, ['subtask_assignment'], async (message: PheromoneMessage) => {
      const subtask = message.payload as Subtask;
      await this.handleTask(subtask);
    });
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
      const result = await this.executeDnsCheck(subtask);

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

      const criticalFindings = (result as DnsScanResult).findings.filter(
        (f) => f.status === 'critical'
      );
      if (criticalFindings.length > 0) {
        await this.pheromoneChannel.publish({
          senderId: this.id,
          type: 'finding',
          timestamp: new Date(),
          payload: {
            subtaskId: subtask.id,
            taskId: subtask.taskId,
            findings: criticalFindings,
            summary: `${criticalFindings.length} hallazgos críticos de DNS`,
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

  private async executeDnsCheck(subtask: Subtask): Promise<DnsScanResult> {
    const domainsToCheck = this.extractTargetDomains(subtask);
    const findings: DnsFinding[] = [];

    for (const domain of domainsToCheck) {
      findings.push(...(await this.simulateWhoisCheck(domain)));
      findings.push(...(await this.simulateDnsChange(domain)));
      findings.push(...(await this.simulateSuspiciousCheck(domain)));
    }

    return {
      findings,
      domainsChecked: domainsToCheck.length,
      timestamp: new Date().toISOString(),
    };
  }

  private extractTargetDomains(subtask: Subtask): string[] {
    const spec = subtask.specification as Record<string, string[]> | undefined;
    if (spec?.domains && Array.isArray(spec.domains)) {
      return spec.domains;
    }
    return this.knownDomains;
  }

  private async simulateWhoisCheck(domain: string): Promise<DnsFinding[]> {
    const findings: DnsFinding[] = [];
    const daysRemaining = Math.floor(Math.random() * 365) + 30;

    if (daysRemaining < 30) {
      findings.push({
        domain,
        checkType: 'expiry',
        status: 'critical',
        detail: `El dominio ${domain} expira en menos de 30 días (${daysRemaining} días restantes)`,
        daysRemaining,
      });
    } else if (daysRemaining < 90) {
      findings.push({
        domain,
        checkType: 'expiry',
        status: 'warning',
        detail: `El dominio ${domain} expira en ${daysRemaining} días. Considere renovar.`,
        daysRemaining,
      });
    } else {
      findings.push({
        domain,
        checkType: 'expiry',
        status: 'ok',
        detail: `Dominio ${domain} al día (${daysRemaining} días restantes)`,
        daysRemaining,
      });
    }

    return findings;
  }

  private async simulateDnsChange(domain: string): Promise<DnsFinding[]> {
    const findings: DnsFinding[] = [];
    const hasChanges = Math.random() < 0.1;

    if (hasChanges) {
      findings.push({
        domain,
        checkType: 'dns_change',
        status: 'warning',
        detail: `Se detectaron cambios en registros DNS de ${domain} desde la última verificación`,
        recordsChanged: ['A', 'TXT'],
      });
    }

    return findings;
  }

  private async simulateSuspiciousCheck(domain: string): Promise<DnsFinding[]> {
    const findings: DnsFinding[] = [];
    const suspiciousPatterns = [
      { pattern: 'typosquatting', risk: 'medium' },
      { pattern: 'lookalike_domain', risk: 'high' },
    ];

    for (const threat of suspiciousPatterns) {
      const detected = Math.random() < 0.02;
      if (detected) {
        findings.push({
          domain,
          checkType: 'suspicious_record',
          status: 'warning',
          detail: `Posible ${threat.pattern} detectado para ${domain}`,
          riskLevel: threat.risk,
        });
      }
    }

    return findings;
  }

  async stop(): Promise<void> {
    console.log(`[DnsBot] ${this.id} detenido`);
    await this.stateStore.close();
    await this.pheromoneChannel.close();
  }
}

export function startDnsBot(): DnsBot {
  const bot = new DnsBot();
  void bot.start();
  return bot;
}
