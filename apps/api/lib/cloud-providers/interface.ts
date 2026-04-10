/**
 * Contrato Plug & Play para proveedores de nube (AWS, Azure, GCP…).
 * El core de Opsly solo depende de esta interfaz; cada adaptador vive en su archivo.
 */

export type CloudProviderId = "aws" | "azure" | "gcp";

/** Planes de aprovisionamiento reconocidos por la API (extensible). */
export type ProvisioningPlan = "free-tier" | "serverless-starter";

export interface ProvisioningCostEstimate {
  readonly monthlyEstimate: number;
  readonly currency: string;
  readonly isFreeTier: boolean;
  /** Desglose legible para UI (opcional). */
  readonly lineItems?: readonly { label: string; amountUsd: number }[];
}

export type ProvisionResourcesResult =
  | { readonly ok: true; readonly reference: string }
  | { readonly ok: false; readonly error: string };

export type ValidateCredentialsResult =
  | { readonly valid: true; readonly accountHint?: string }
  | { readonly valid: false; readonly message: string };

/**
 * Configuración opaca por proveedor (p. ej. región, tags, ARNs).
 * Cada implementación valida su forma.
 */
export type ProvisioningConfig = Record<string, unknown>;

export interface CloudProvider {
  readonly id: CloudProviderId;

  estimateProvisioningCost(plan: ProvisioningPlan): Promise<ProvisioningCostEstimate>;

  /**
   * Despliegue real (Terraform / SDK). MVP puede devolver referencia async / cola.
   */
  provisionResources(
    tenantId: string,
    config: ProvisioningConfig,
  ): Promise<ProvisionResourcesResult>;

  /**
   * Valida credenciales del cliente (p. ej. AWS: access key + secret en JSON seguro o rol).
   * No almacenar secretos en logs.
   */
  validateCredentials(apiKey: string): Promise<ValidateCredentialsResult>;
}
