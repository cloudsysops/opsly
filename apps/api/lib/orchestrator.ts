import { z } from "zod";
import { sendWelcomeEmail } from "./email";
import {
  renderTenantComposeFromTemplate,
  writeComposeFile,
} from "./docker/compose-generator";
import {
  getTenantComposePath,
  startTenant,
  stopTenant,
} from "./docker/container";
import { allocatePorts, releasePorts } from "./docker/port-allocator";
import { notifyTenantCreated, notifyTenantFailed } from "./notifications";
import { getServiceClient } from "./supabase";
import type { Json, PlanKey, Tenant } from "./supabase/types";
import { PLAN_SERVICES } from "./stripe/plans";

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

class OnboardingOrchestrator {
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

      this.ports = await allocatePorts(this.tenantId, [...PLAN_SERVICES[this.plan]]);
      lastCompletedStep = 4;

      const composeYaml = await renderTenantComposeFromTemplate(
        this.slug,
        this.ports,
      );
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
    const db = getServiceClient();
    const { data, error } = await db
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
      const err = new Error(error?.message ?? "Failed to create tenant") as Error & {
        code?: string;
      };
      if (error?.code) {
        err.code = error.code;
      }
      throw err;
    }

    return data.id;
  }

  private async logAudit(action: string): Promise<void> {
    if (!this.tenantId) {
      return;
    }

    const { error } = await getServiceClient().schema("platform").from("audit_log").insert({
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
    const domain =
      process.env.PLATFORM_DOMAIN ?? process.env.PLATFORM_BASE_DOMAIN;
    if (!domain) {
      throw new Error("Missing PLATFORM_DOMAIN or PLATFORM_BASE_DOMAIN");
    }
    if (!this.tenantId) {
      throw new Error("Tenant not initialized");
    }

    // Hostnames match infra/templates/docker-compose.tenant.yml.tpl (Traefik rules).
    const services: Json = {
      n8n: `https://n8n-${this.slug}.${domain}/`,
      uptime_kuma: `https://uptime-${this.slug}.${domain}/`,
    };

    const { error } = await getServiceClient()
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

    const { data, error } = await getServiceClient()
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
      await getServiceClient()
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
      await getServiceClient().schema("platform").from("tenants").delete().eq("id", this.tenantId);
    }
  }
}

export type ProvisionTenantInput = {
  slug: string;
  owner_email: string;
  plan: PlanKey;
  stripe_customer_id?: string;
};

export async function provisionTenant(
  input: ProvisionTenantInput,
): Promise<{ id: string; slug: string; status: "provisioning" }> {
  const orchestrator = new OnboardingOrchestrator(
    input.slug,
    input.owner_email,
    input.plan,
    input.stripe_customer_id,
  );

  const id = await orchestrator.createAndBeginProvisioning();

  void orchestrator.runProvisioningPipeline().catch((err: unknown) => {
    console.error("Onboarding pipeline error:", err);
  });

  return { id, slug: input.slug, status: "provisioning" };
}

export async function deleteTenant(tenantId: string): Promise<void> {
  const db = getServiceClient();
  const { data: tenant, error: fetchError } = await db
    .schema("platform")
    .from("tenants")
    .select("id, slug")
    .eq("id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const composePath = getTenantComposePath(tenant.slug);
  await stopTenant(tenant.slug, composePath).catch(() => undefined);

  const { error: updateError } = await db
    .schema("platform")
    .from("tenants")
    .update({
      deleted_at: new Date().toISOString(),
      status: "deleted",
    })
    .eq("id", tenant.id);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function suspendTenant(
  tenantId: string,
  actor = "platform-api",
): Promise<void> {
  const db = getServiceClient();
  const { data: tenant, error: fetchError } = await db
    .schema("platform")
    .from("tenants")
    .select("id, slug")
    .eq("id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const composePath = getTenantComposePath(tenant.slug);
  await stopTenant(tenant.slug, composePath).catch(() => undefined);

  const { error: updateError } = await db
    .schema("platform")
    .from("tenants")
    .update({ status: "suspended" })
    .eq("id", tenant.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: auditError } = await db.schema("platform").from("audit_log").insert({
    tenant_id: tenant.id,
    action: "suspended",
    actor,
    metadata: { slug: tenant.slug },
  });

  if (auditError) {
    throw new Error(auditError.message);
  }
}

export async function resumeTenant(tenantId: string): Promise<void> {
  const db = getServiceClient();
  const { data: tenant, error: fetchError } = await db
    .schema("platform")
    .from("tenants")
    .select("id, slug, status")
    .eq("id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!tenant) {
    throw new Error("Tenant not found");
  }

  if (tenant.status !== "suspended") {
    throw new Error("Tenant is not suspended");
  }

  const { error: deployingError } = await db
    .schema("platform")
    .from("tenants")
    .update({ status: "deploying", progress: 50 })
    .eq("id", tenant.id);

  if (deployingError) {
    throw new Error(deployingError.message);
  }

  const composePath = getTenantComposePath(tenant.slug);
  await startTenant(tenant.slug, composePath);

  const { data: portsRows, error: portsError } = await db
    .schema("platform")
    .from("port_allocations")
    .select("port, service")
    .eq("tenant_id", tenant.id);

  if (portsError) {
    throw new Error(portsError.message);
  }

  const ports: Record<string, number> = {};
  for (const row of portsRows ?? []) {
    if (row.service === "available") {
      continue;
    }
    ports[row.service] = row.port;
  }

  await pollPortsUntilHealthy(ports);

  const { error: activeError } = await db
    .schema("platform")
    .from("tenants")
    .update({ status: "active", progress: 100 })
    .eq("id", tenant.id);

  if (activeError) {
    throw new Error(activeError.message);
  }

  const { error: auditError } = await db.schema("platform").from("audit_log").insert({
    tenant_id: tenant.id,
    action: "resumed",
    actor: "platform-api",
    metadata: { slug: tenant.slug },
  });

  if (auditError) {
    throw new Error(auditError.message);
  }
}
