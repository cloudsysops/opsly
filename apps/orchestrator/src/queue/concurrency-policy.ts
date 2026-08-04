import os from 'os';

export interface ConcurrencyPolicy {
  plan: 'enterprise' | 'business' | 'startup';
  baseWorkerConcurrency: number;
  cpuThreshold: number;
  memoryThreshold: number;
  maxBurst: number;
  minConcurrency: number;
}

export interface SystemMetrics {
  cpuUsage: number; // 0-100
  memoryUsage: number; // 0-100
  activeConnections: number;
  timestamp: Date;
}

export const CONCURRENCY_POLICIES: Record<string, ConcurrencyPolicy> = {
  enterprise: {
    plan: 'enterprise',
    baseWorkerConcurrency: 10,
    cpuThreshold: 80,
    memoryThreshold: 85,
    maxBurst: 15,
    minConcurrency: 5,
  },
  business: {
    plan: 'business',
    baseWorkerConcurrency: 5,
    cpuThreshold: 75,
    memoryThreshold: 80,
    maxBurst: 8,
    minConcurrency: 2,
  },
  startup: {
    plan: 'startup',
    baseWorkerConcurrency: 2,
    cpuThreshold: 70,
    memoryThreshold: 75,
    maxBurst: 3,
    minConcurrency: 1,
  },
};

export function getSystemMetrics(): SystemMetrics {
  const cpus = os.cpus();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();

  // Calculate CPU usage from average load and number of CPUs
  const avgLoad = os.loadavg()[0];
  const cpuUsage = Math.min(100, (avgLoad / cpus.length) * 100);

  // Calculate memory usage percentage
  const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;

  return {
    cpuUsage: Math.round(cpuUsage * 100) / 100,
    memoryUsage: Math.round(memoryUsage * 100) / 100,
    activeConnections: 0, // Will be populated from worker state
    timestamp: new Date(),
  };
}

export async function getDynamicConcurrency(
  workerName: string,
  tenantPlan: string,
  systemMetrics: SystemMetrics
): Promise<number> {
  const policy =
    CONCURRENCY_POLICIES[tenantPlan] ||
    CONCURRENCY_POLICIES['startup'];

  let concurrency = policy.baseWorkerConcurrency;

  // Scale down if system is under pressure
  if (systemMetrics.cpuUsage > policy.cpuThreshold) {
    const scaleFactor =
      1 - (systemMetrics.cpuUsage - policy.cpuThreshold) / (100 - policy.cpuThreshold);
    concurrency = Math.max(
      policy.minConcurrency,
      Math.floor(concurrency * scaleFactor)
    );
  }

  if (systemMetrics.memoryUsage > policy.memoryThreshold) {
    const scaleFactor =
      1 - (systemMetrics.memoryUsage - policy.memoryThreshold) / (100 - policy.memoryThreshold);
    concurrency = Math.max(
      policy.minConcurrency,
      Math.floor(concurrency * scaleFactor)
    );
  }

  return concurrency;
}

export class ConcurrencyManager {
  private policies: Map<string, ConcurrencyPolicy> = new Map();
  private workerConcurrency: Map<string, number> = new Map();
  private lastMetrics: SystemMetrics | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize with default policies
    Object.entries(CONCURRENCY_POLICIES).forEach(([plan, policy]) => {
      this.policies.set(plan, policy);
    });
  }

  addPolicy(plan: string, policy: ConcurrencyPolicy): void {
    this.policies.set(plan, policy);
  }

  getPolicy(plan: string): ConcurrencyPolicy {
    return this.policies.get(plan) || CONCURRENCY_POLICIES['startup'];
  }

  async calculateConcurrency(
    workerName: string,
    tenantPlan: string
  ): Promise<number> {
    const metrics = getSystemMetrics();
    this.lastMetrics = metrics;

    return getDynamicConcurrency(workerName, tenantPlan, metrics);
  }

  setWorkerConcurrency(workerName: string, concurrency: number): void {
    this.workerConcurrency.set(workerName, concurrency);
  }

  getWorkerConcurrency(workerName: string): number {
    return this.workerConcurrency.get(workerName) || 2;
  }

  getAllWorkerConcurrency(): Map<string, number> {
    return new Map(this.workerConcurrency);
  }

  getSystemMetrics(): SystemMetrics | null {
    return this.lastMetrics;
  }

  /**
   * Start periodic concurrency adjustment
   * Should be called once per orchestrator instance
   */
  startConcurrencyWatcher(
    intervalMs: number = 30_000,
    onConcurrencyChange?: (
      workerName: string,
      oldConcurrency: number,
      newConcurrency: number
    ) => void
  ): void {
    if (this.updateInterval) {
      return; // Already running
    }

    this.updateInterval = setInterval(async () => {
      const metrics = getSystemMetrics();
      this.lastMetrics = metrics;

      // Update concurrency for each worker based on their plan
      for (const [workerName, currentConcurrency] of this.workerConcurrency) {
        // Note: In production, would fetch tenantPlan from somewhere
        // For now, use base concurrency from policy
        const newConcurrency = await this.calculateConcurrency(
          workerName,
          'startup'
        );

        if (newConcurrency !== currentConcurrency && onConcurrencyChange) {
          onConcurrencyChange(workerName, currentConcurrency, newConcurrency);
          this.workerConcurrency.set(workerName, newConcurrency);
        }
      }
    }, intervalMs);
  }

  stopConcurrencyWatcher(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

let globalConcurrencyManager: ConcurrencyManager | null = null;

export function initializeConcurrencyManager(): ConcurrencyManager {
  globalConcurrencyManager = new ConcurrencyManager();
  return globalConcurrencyManager;
}

export function getConcurrencyManager(): ConcurrencyManager {
  if (!globalConcurrencyManager) {
    globalConcurrencyManager = new ConcurrencyManager();
  }
  return globalConcurrencyManager;
}
