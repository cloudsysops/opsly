/**
 * Provisionamiento inicial de recursos dedicados por tenant (2 Workers).
 * En Opsly el runtime real es Docker Compose por tenant; aquí solo la interfaz y simulación estable.
 */

export interface ProvisionJobRef {
  readonly provider: "kubernetes" | "terraform" | "compose";
  readonly jobName: string;
  readonly workersRequested: number;
}

export interface ProvisionResult {
  readonly tenantId: string;
  readonly workersDeployed: number;
  readonly job: ProvisionJobRef;
}

export interface WorkerProvisionAdapter {
  readonly apply: (input: {
    tenantId: string;
    workerCount: number;
  }) => Promise<ProvisionJobRef>;
}

/** Simula apply Terraform/K8s: sustituir por llamada real a tu control plane. */
async function defaultSimulatedApply(input: {
  tenantId: string;
  workerCount: number;
}): Promise<ProvisionJobRef> {
  const jobName = `tenant-${input.tenantId}-workers-${input.workerCount}`;
  return {
    provider: "kubernetes",
    jobName,
    workersRequested: input.workerCount,
  };
}

const DEFAULT_WORKERS = 2;

export class TenantBootstrapper {
  private readonly adapter: WorkerProvisionAdapter;

  constructor(adapter?: WorkerProvisionAdapter) {
    this.adapter = adapter ?? { apply: defaultSimulatedApply };
  }

  /**
   * Despliega 2 workers dedicados para el tenant (simulado).
   * Integración real: `adapter.apply` → API Terraform / controller K8s / script compose remoto.
   */
  async provisionResources(tenantId: string): Promise<ProvisionResult> {
    const trimmed = tenantId.trim();
    if (trimmed.length === 0) {
      throw new Error("tenantId requerido");
    }
    const job = await this.adapter.apply({
      tenantId: trimmed,
      workerCount: DEFAULT_WORKERS,
    });
    return {
      tenantId: trimmed,
      workersDeployed: DEFAULT_WORKERS,
      job,
    };
  }
}
