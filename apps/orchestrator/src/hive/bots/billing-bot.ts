import type { Bot, Subtask, PheromoneMessage } from '../types.js';
import { PheromoneChannel } from '../pheromone-channel.js';
import { HiveStateStore } from '../hive-state.js';

interface BillingAnomaly {
  service: string;
  metric: string;
  currentValue: number;
  historicalAverage: number;
  percentChange: number;
  absoluteDifference: number;
  severity: 'info' | 'warning' | 'critical';
  recommendedAction: string;
}

interface BillingScanResult {
  anomalies: BillingAnomaly[];
  servicesChecked: number;
  periodStart: string;
  periodEnd: string;
  totalEstimatedCost: number;
  totalChangePercent: number;
  timestamp: string;
}

interface ServiceBillingProfile {
  name: string;
  baseMonthly: number;
  variance: number;
  tier: 'fixed' | 'usage' | 'tiered';
}

const SERVICE_PROFILES: ServiceBillingProfile[] = [
  { name: 'DigitalOcean VPS', baseMonthly: 12, variance: 0, tier: 'fixed' },
  { name: 'Supabase', baseMonthly: 25, variance: 5, tier: 'usage' },
  { name: 'Doppler', baseMonthly: 0, variance: 0, tier: 'fixed' },
  { name: 'Resend', baseMonthly: 0, variance: 10, tier: 'usage' },
  { name: 'LLM Gateway (Anthropic)', baseMonthly: 20, variance: 15, tier: 'usage' },
  { name: 'LLM Gateway (OpenAI)', baseMonthly: 5, variance: 8, tier: 'usage' },
  { name: 'n8n Cloud', baseMonthly: 0, variance: 0, tier: 'fixed' },
  { name: 'Cloudflare', baseMonthly: 0, variance: 0, tier: 'fixed' },
  { name: 'Stripe', baseMonthly: 0, variance: 2, tier: 'usage' },
  { name: 'GitHub Actions', baseMonthly: 0, variance: 3, tier: 'usage' },
];

const ANOMALY_THRESHOLD_WARNING = 20;
const ANOMALY_THRESHOLD_CRITICAL = 50;

export class BillingBot implements Bot {
  id: string;
  role: 'billing' = 'billing';
  status: 'idle' | 'working' | 'blocked' | 'offline' = 'idle';
  skills = [
    'cost_analyzer',
    'usage_pattern_detector',
    'anomaly_detector',
    'budget_forecaster',
  ];
  capacity = 2;
  concurrentTasks = 0;
  lastHeartbeat = new Date();
  private pheromoneChannel: PheromoneChannel;
  private stateStore: HiveStateStore;
  private currentTasks: Map<string, Subtask> = new Map();

  constructor() {
    this.id = `billing-${Date.now()}`;
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
    console.log(`[BillingBot] ${this.id} iniciado`);
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
      const result = await this.executeBillingAnalysis(subtask);

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

      const critical = (result as BillingScanResult).anomalies.filter(
        (a) => a.severity === 'critical'
      );
      if (critical.length > 0) {
        await this.pheromoneChannel.publish({
          senderId: this.id,
          type: 'finding',
          timestamp: new Date(),
          payload: {
            subtaskId: subtask.id,
            taskId: subtask.taskId,
            anomalies: critical,
            summary: `${critical.length} anomalías críticas de facturación detectadas`,
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

  private async executeBillingAnalysis(subtask: Subtask): Promise<BillingScanResult> {
    const spec = subtask.specification as Record<string, unknown> | undefined;
    const monthsBack = typeof spec?.monthsBack === 'number' ? spec.monthsBack : 1;
    const now = new Date();

    const periodStart = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    const periodEnd = now;

    const anomalies: BillingAnomaly[] = [];
    let totalEstimatedCost = 0;
    let totalHistorical = 0;

    const profiles = spec?.services
      ? SERVICE_PROFILES.filter((p) => (spec.services as string[]).includes(p.name))
      : SERVICE_PROFILES;

    for (const profile of profiles) {
      const variance = profile.tier === 'fixed' ? 0 : this.simulateUsageVariance(profile);
      const currentCost = profile.baseMonthly + variance;
      const historicalCost = profile.baseMonthly;

      totalEstimatedCost += currentCost;
      totalHistorical += historicalCost;

      if (profile.tier !== 'fixed' && variance > 0) {
        const percentChange = historicalCost > 0
          ? Math.round(((currentCost - historicalCost) / historicalCost) * 100)
          : 0;

        let severity: 'info' | 'warning' | 'critical' = 'info';
        if (percentChange >= ANOMALY_THRESHOLD_CRITICAL) {
          severity = 'critical';
        } else if (percentChange >= ANOMALY_THRESHOLD_WARNING) {
          severity = 'warning';
        }

        if (severity !== 'info') {
          anomalies.push({
            service: profile.name,
            metric: 'cost',
            currentValue: currentCost,
            historicalAverage: historicalCost,
            percentChange,
            absoluteDifference: Math.round((currentCost - historicalCost) * 100) / 100,
            severity,
            recommendedAction: this.buildRecommendation(profile, percentChange),
          });
        }
      }
    }

    const totalChangePercent = totalHistorical > 0
      ? Math.round(((totalEstimatedCost - totalHistorical) / totalHistorical) * 100)
      : 0;

    return {
      anomalies,
      servicesChecked: profiles.length,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      totalEstimatedCost: Math.round(totalEstimatedCost * 100) / 100,
      totalChangePercent,
      timestamp: now.toISOString(),
    };
  }

  private simulateUsageVariance(profile: ServiceBillingProfile): number {
    const spike = Math.random() < 0.15 ? Math.random() * 3 : 0;
    return Math.round((Math.random() * profile.variance + spike) * 100) / 100;
  }

  private buildRecommendation(profile: ServiceBillingProfile, percentChange: number): string {
    if (percentChange > 200) {
      return `URGENT: Revisar ${profile.name} - el costo se disparó ${percentChange}%. Posible bucle infinito, fuga de recursos o ataque.`;
    }
    if (percentChange > 75) {
      return `ALERTA: ${profile.name} subió ${percentChange}%. Verificar patrones de uso y considerar límites de gasto.`;
    }
    if (percentChange > ANOMALY_THRESHOLD_CRITICAL) {
      return `${profile.name} incrementó ${percentChange}%. Revisar dashboards de uso y ajustar presupuesto si es tendencia.`;
    }
    return `${profile.name} incrementó ${percentChange}%. Monitorear próxima facturación.`;
  }

  async stop(): Promise<void> {
    console.log(`[BillingBot] ${this.id} detenido`);
    await this.stateStore.close();
    await this.pheromoneChannel.close();
  }
}

export function startBillingBot(): BillingBot {
  const bot = new BillingBot();
  void bot.start();
  return bot;
}
