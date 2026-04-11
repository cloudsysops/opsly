import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";

import type {
    CloudProvider,
    CloudProviderId,
    ProvisioningConfig,
    ProvisioningCostEstimate,
    ProvisioningPlan,
    ProvisionResourcesResult,
    ValidateCredentialsResult,
} from "./interface";

const DEFAULT_AWS_REGION = "us-east-1";
const MAX_ACCOUNT_HINT_LEN = 48;

function parseJsonCredentials(apiKey: string): { accessKeyId?: string; secretAccessKey?: string } {
  const trimmed = apiKey.trim();
  if (trimmed.length === 0) {
    return {};
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "accessKeyId" in parsed &&
      "secretAccessKey" in parsed
    ) {
      return {
        accessKeyId: String((parsed as { accessKeyId: unknown }).accessKeyId),
        secretAccessKey: String((parsed as { secretAccessKey: unknown }).secretAccessKey),
      };
    }
  } catch {
    // Not JSON, fall through
  }
  return {};
}

function getEnvCredentials(): { accessKeyId?: string; secretAccessKey?: string } {
  const keyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secret = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (keyId && secret) {
    return { accessKeyId: keyId, secretAccessKey: secret };
  }
  return {};
}

function extractArn(arn: string): string {
  return arn.length > MAX_ACCOUNT_HINT_LEN ? arn.slice(0, MAX_ACCOUNT_HINT_LEN) : arn;
}

/**
 * Adaptador AWS (SDK v3). MVP: costes fijos; validación vía STS.
 * Futuro: Pricing API, CloudFormation/CDK, per-tenant IAM roles.
 */
export class AwsCloudProvider implements CloudProvider {
  readonly id: CloudProviderId = "aws";

  async estimateProvisioningCost(plan: ProvisioningPlan): Promise<ProvisioningCostEstimate> {
    switch (plan) {
      case "free-tier":
        return {
          monthlyEstimate: 0,
          currency: "USD",
          isFreeTier: true,
          lineItems: [
            { label: "Lambda (uso dentro de free tier)", amountUsd: 0 },
            { label: "Almacenamiento serverless / DB free tier (estimado)", amountUsd: 0 },
          ],
        };
      case "serverless-starter":
        return {
          monthlyEstimate: 15,
          currency: "USD",
          isFreeTier: false,
          lineItems: [
            { label: "Lambda + API Gateway (estimado conservador)", amountUsd: 10 },
            { label: "RDS / Dynamo según región (placeholder)", amountUsd: 5 },
          ],
        };
      default: {
        const _e: never = plan;
        throw new Error(`Plan AWS no soportado: ${_e}`);
      }
    }
  }

  async provisionResources(
    tenantId: string,
    _config: ProvisioningConfig,
  ): Promise<ProvisionResourcesResult> {
    void _config;
    if (!tenantId || tenantId.trim().length === 0) {
      return { ok: false, error: "tenantId requerido" };
    }
    // MVP: no despliegue real; cola / ticket en iteración siguiente.
    return {
      ok: true,
      reference: `aws-provision-pending:${tenantId}:${Date.now()}`,
    };
  }

  /**
   * Espera `apiKey` como JSON: `{"accessKeyId":"...","secretAccessKey":"..."}` o variables de entorno
   * `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` si `apiKey` es cadena vacía (solo entornos controlados).
   */
  async validateCredentials(apiKey: string): Promise<ValidateCredentialsResult> {
    const jsonCreds = parseJsonCredentials(apiKey);
    const envCreds = getEnvCredentials();
    const accessKeyId = jsonCreds.accessKeyId ?? envCreds.accessKeyId;
    const secretAccessKey = jsonCreds.secretAccessKey ?? envCreds.secretAccessKey;

    if (!accessKeyId || !secretAccessKey) {
      return {
        valid: false,
        message: "Faltan credenciales AWS (JSON o env AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)",
      };
    }

    const client = new STSClient({
      region: process.env.AWS_REGION?.trim() || DEFAULT_AWS_REGION,
      credentials: { accessKeyId, secretAccessKey },
    });

    try {
      const out = await client.send(new GetCallerIdentityCommand({}));
      const arn = out.Arn ?? "";
      return { valid: true, accountHint: extractArn(arn) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { valid: false, message: msg };
    }
  }
}
