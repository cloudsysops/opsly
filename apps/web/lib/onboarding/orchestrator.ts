import { z } from "zod";
import { generateCompose, writeComposeFile } from "../docker/compose-generator";
import { allocatePorts, releasePorts } from "../docker/port-allocator";
import { startTenant, stopTenant } from "../docker/container-manager";
import { notifyTenantCreated, notifyTenantFailed } from "../notifications/discord";
import { sendWelcomeEmail } from "../notifications/email";
import { adminClient } from "../supabase/admin";
import type { Json, PlanKey, Tenant } from "../supabase/types";
import { PLANS } from "../stripe/plans";

const onboardingInputSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,30}$/),
  email: z.string().email(),
  plan: z.enum(["startup", "business", "enterprise", "demo"]),
  stripeCustomerId: z.string().min(1).optional(),
});

export type OnboardingResult = {
  success: boolean;
  tenantId?: string;
  services?: object;
  error?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function pollPortsUntilHealthy(
  ports: Record<string, number>,
): Promise<void> {
  const urls = Object.values(ports).map(
    (port) => `http://127.0.0.1:${port}/healthz`,
  );

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const checks = await Promise.all(
      urls.map(async (url) => {
        try {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(4000),
          });
          return response.ok;
        } catch {
          return false;
        }
      }),
    );

    if (checks.every(Boolean)) {
      return;
    }

    await sleep(5000);
  }

  throw new Error("Health checks did not pass within the allotted time");
}

export class OnboardingOrchestrator {
  private tenantId: string | undefined;

  private composePath: string | undefined;

  private ports: Record<string, number> | undefined;

  constructor(
    private readonly slug: string,
    private readonly email: string,
    private readonly plan: PlanKey,
    private readonly stripeCustomerId: string | undefined,
  ) {}

  async createAndBeginProvisioning(): Promise<string> {
    await this.validateInputs();
    this.tenantId = await this.createTenantRecord();
    await this.logAudit("onboarding_started");
    return this.tenantId;
  }

  async runProvisioningPipeline(): Promise<OnboardingResult> {
    let lastCompletedStep = 3;
    try {
      if (!this.tenantId) {
        throw new Error("Tenant identifier missing before provisioning pipeline");
      }

      this.ports = await allocatePorts(this.tenantId, [...PLANS[this.plan].services]);
      lastCompletedStep = 4;

      const composeYaml = generateCompose(this.slug, this.ports);
      this.composePath = await writeComposeFile(this.slug, composeYaml);
      lastCompletedStep = 5;

      await startTenant(this.slug, this.composePath);
      lastCompletedStep = 6;

      await pollPortsUntilHealthy(this.ports);
      lastCompletedStep = 7;

      await this.updateTenantActive();
      lastCompletedStep = 8;

      const tenant = await this.fetchTenantRow();

      await sendWelcomeEmail(tenant.owner_email, tenant.services);
      lastCompletedStep = 9;

      await notifyTenantCreated(tenant);
      lastCompletedStep = 10;

      return {
        success: true,
        tenantId: this.tenantId,
        services: tenant.services as object,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown onboarding error";
      await this.rollback(lastCompletedStep).catch(() => undefined);
      await notifyTenantFailed(this.slug, message).catch(() => undefined);
      return { success: false, error: message };
    }
  }

  async run(): Promise<OnboardingResult> {
    await this.createAndBeginProvisioning();
    return this.runProvisioningPipeline();
  }

  private async validateInputs(): Promise<void> {
    onboardingInputSchema.parse({
      slug: this.slug,
      email: this.email,
      plan: this.plan,
      stripeCustomerId: this.stripeCustomerId,
    });
  }

  private async createTenantRecord(): Promise<string> {
    const { data, error } = await adminClient
      .schema("platform")
      .from("tenants")
      .insert({
        slug: this.slug,
        name: this.slug,
        owner_email: this.email,
        plan: this.plan,
        status: "provisioning",
        progress: 0,
        stripe_customer_id: this.stripeCustomerId ?? null,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create tenant");
    }

    return data.id;
  }

  private async logAudit(action: string): Promise<void> {
    if (!this.tenantId) {
      return;
    }

    const { error } = await adminClient.schema("platform").from("audit_log").insert({
      tenant_id: this.tenantId,
      action,
      actor: "onboarding-orchestrator",
      metadata: { slug: this.slug },
    });

    if (error) {
      throw new Error(`Failed to write audit log: ${error.message}`);
    }
  }

  private async updateTenantActive(): Promise<void> {
    const domain = process.env.PLATFORM_BASE_DOMAIN;
    if (!domain) {
      throw new Error("Missing PLATFORM_BASE_DOMAIN");
    }
    if (!this.tenantId) {
      throw new Error("Tenant not initialized");
    }

    const services: Json = {
      n8n: `https://n8n.${this.slug}.${domain}/`,
      uptime_kuma: `https://status.${this.slug}.${domain}/`,
    };

    const { error } = await adminClient
      .schema("platform")
      .from("tenants")
      .update({
        status: "active",
        progress: 100,
        services,
      })
      .eq("id", this.tenantId);

    if (error) {
      throw new Error(`Failed to finalize tenant: ${error.message}`);
    }
  }

  private async fetchTenantRow(): Promise<Tenant> {
    if (!this.tenantId) {
      throw new Error("Tenant not initialized");
    }

    const { data, error } = await adminClient
      .schema("platform")
      .from("tenants")
      .select("*")
      .eq("id", this.tenantId)
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to load tenant");
    }

    return data;
  }

  private async rollback(step: number): Promise<void> {
    if (this.composePath && step >= 6) {
      await stopTenant(this.slug, this.composePath).catch(() => undefined);
    }

    if (!this.tenantId) {
      return;
    }

    if (step >= 8) {
      await adminClient
        .schema("platform")
        .from("tenants")
        .update({
          status: "failed",
          progress: 0,
        })
        .eq("id", this.tenantId);

      if (step >= 4) {
        await releasePorts(this.tenantId).catch(() => undefined);
      }
      return;
    }

    if (step >= 4) {
      await releasePorts(this.tenantId).catch(() => undefined);
    }

    if (step >= 2) {
      await adminClient.schema("platform").from("tenants").delete().eq("id", this.tenantId);
    }
  }
}
