import { z } from 'zod';
import { BUDGET_AUTO_SUSPEND_METADATA_KEY } from './billing/budget-constants';
import { ONBOARDING_PIPELINE, ONBOARDING_ROLLBACK, ORCHESTRATION_HEALTH } from './constants';
import { renderTenantComposeFromTemplate, writeComposeFile } from './docker/compose-generator';
import { resolveTenantComposePath, startTenant, stopTenant } from './docker/container';
import { allocatePorts, releasePorts } from './docker/port-allocator';
import { runTenantStructureHookSafe } from './docker/tenant-structure-hook';
import { logger } from './logger';
import { notifyTenantCreated, notifyTenantFailed } from './notifications';
import { sendPortalInvitationForTenant } from './portal-invitations';
import { PLAN_SERVICES } from './stripe/plans';
import { getServiceClient } from './supabase';
import type { Json, PlanKey, Tenant } from './supabase/types';

const onboardingInputSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,30}$/),
  email: z.string().email(),
  plan: z.enum(['startup', 'business', 'enterprise', 'demo']),
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

const TENANT_PERSISTENCE_CHECK = {
  MAX_ATTEMPTS: 5,
  SLEEP_MS: 150,
} as const;

async function readTenantIdExists(
  db: ReturnType<typeof getServiceClient>,
  tenantId: string
): Promise<{
  ok: boolean;
  verifyError: { code?: string; message: string } | null;
}> {
  const { data: verification, error: verifyError } = await db
    .schema('platform')
    .from('tenants')
    .select('id')
    .eq('id', tenantId)
    .maybeSingle();

  if (!verifyError && verification) {
    return { ok: true, verifyError: null };
  }

  return { ok: false, verifyError: verifyError ?? null };
}

function formatTenantVerifyDetails(verifyError: { code?: string; message: string } | null): string {
  if (!verifyError) {
    return 'not-found';
  }
  return `${verifyError.code ?? 'unknown'}:${verifyError.message}`;
}

function throwTenantInsertVerifyFailed(params: {
  tenantId: string;
  slug: string;
  attempts: number;
  details: string;
}): never {
  const msg = `Tenant insert verification failed for ${params.tenantId} after ${String(
    params.attempts
  )} attempts (${params.details})`;
  logger.error('tenant.provisioning.insert.verify_failed', {
    slug: params.slug,
    tenant_id: params.tenantId,
    details: params.details,
  });
  throw new Error(msg);
}

function resolveTenantServicesDomain(): string {
  const tenantDomain =
    process.env.TENANT_BASE_DOMAIN?.trim() ?? process.env.PLATFORM_BASE_DOMAIN?.trim();
  if (tenantDomain && tenantDomain.length > 0) {
    return tenantDomain;
  }
  const platformDomain = process.env.PLATFORM_DOMAIN?.trim();
  if (platformDomain && platformDomain.length > 0) {
    return platformDomain;
  }
  throw new Error('Missing TENANT_BASE_DOMAIN or PLATFORM_DOMAIN');
}

async function verifyTenantReadableAttempt(
  db: ReturnType<typeof getServiceClient>,
  tenantId: string,
  slug: string,
  attempt: number
): Promise<void> {
  const { ok, verifyError } = await readTenantIdExists(db, tenantId);
  if (ok) {
    return;
  }

  const isLastAttempt = attempt === TENANT_PERSISTENCE_CHECK.MAX_ATTEMPTS;
  if (!isLastAttempt) {
    await sleep(TENANT_PERSISTENCE_CHECK.SLEEP_MS);
    await verifyTenantReadableAttempt(db, tenantId, slug, attempt + 1);
    return;
  }

  throwTenantInsertVerifyFailed({
    tenantId,
    slug,
    attempts: TENANT_PERSISTENCE_CHECK.MAX_ATTEMPTS,
    details: formatTenantVerifyDetails(verifyError),
  });
}

async function waitForTenantIdReadable(
  db: ReturnType<typeof getServiceClient>,
  tenantId: string,
  slug: string
): Promise<void> {
  await verifyTenantReadableAttempt(db, tenantId, slug, 1);
}

type TenantInsertRowInput = {
  slug: string;
  email: string;
  plan: PlanKey;
  stripeCustomerId: string | undefined;
};

type SupabaseInsertError = { code?: string; message?: string } | null;

function buildTenantProvisioningInsertPayload(
  input: TenantInsertRowInput
): Record<string, unknown> {
  return {
    slug: input.slug,
    name: input.slug,
    owner_email: input.email,
    plan: input.plan,
    status: 'provisioning',
    progress: 0,
    stripe_customer_id: input.stripeCustomerId ?? null,
  };
}

function mapSupabaseInsertErrorToThrowable(error: SupabaseInsertError): Error {
  const err = new Error(error?.message ?? 'Failed to create tenant') as Error & {
    code?: string;
  };
  if (error?.code) {
    err.code = error.code;
  }
  return err;
}

function logTenantInsertFailure(slug: string, error: SupabaseInsertError): void {
  logger.error('tenant.provisioning.insert.failed', {
    slug,
    code: error?.code ?? null,
    message: error?.message ?? null,
  });
}

async function insertTenantProvisioningRow(input: TenantInsertRowInput): Promise<string> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('tenants')
    .insert(buildTenantProvisioningInsertPayload(input))
    .select('id')
    .single();

  if (error || !data) {
    logTenantInsertFailure(input.slug, error);
    throw mapSupabaseInsertErrorToThrowable(error);
  }

  return data.id;
}

function mergeBudgetAutoSuspendFlag(metadata: Json): Json {
  const base =
    metadata !== null && typeof metadata === 'object' && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  base[BUDGET_AUTO_SUSPEND_METADATA_KEY] = true;
  return base as Json;
}

function stripBudgetAutoSuspendFlag(metadata: Json): Json {
  if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return metadata;
  }
  const next = { ...(metadata as Record<string, unknown>) };
  delete next[BUDGET_AUTO_SUSPEND_METADATA_KEY];
  return next as Json;
}

export async function pollPortsUntilHealthy(ports: Record<string, number>): Promise<void> {
  // Build health check URLs based on service type
  const healthCheckUrls = Object.entries(ports).map(([service, port]) => {
    const isContextBuilderOrMcp =
      service === 'context_builder' || service === 'mcp';
    const endpoint = isContextBuilderOrMcp ? '/health' : '/healthz';
    return `http://127.0.0.1:${port}${endpoint}`;
  });

  for (let attempt = 0; attempt < ORCHESTRATION_HEALTH.MAX_ATTEMPTS; attempt += 1) {
    const checks = await Promise.all(
      healthCheckUrls.map(async (url) => {
        try {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(ORCHESTRATION_HEALTH.FETCH_TIMEOUT_MS),
          });
          return response.ok;
        } catch {
          return false;
        }
      })
    );

    if (checks.every(Boolean)) {
      return;
    }

    await sleep(ORCHESTRATION_HEALTH.POLL_INTERVAL_MS);
  }

  throw new Error('Health checks did not pass within the allotted time');
}

class OnboardingOrchestrator {
  private tenantId: string | undefined;

  private composePath: string | undefined;

  private ports: Record<string, number> | undefined;

  private n8nBasicAuthUser: string | undefined;

  private n8nBasicAuthPassword: string | undefined;

  constructor(
    private readonly slug: string,
    private readonly email: string,
    private readonly plan: PlanKey,
    private readonly stripeCustomerId: string | undefined
  ) {}

  async createAndBeginProvisioning(): Promise<string> {
    await this.validateInputs();
    logger.info('tenant.provisioning.insert.start', {
      slug: this.slug,
      owner_email: this.email,
      plan: this.plan,
    });
    this.tenantId = await this.createTenantRecord();
    logger.info('tenant.provisioning.insert.done', {
      slug: this.slug,
      tenant_id: this.tenantId,
      plan: this.plan,
    });
    await this.logAudit('onboarding_started');
    return this.tenantId;
  }

  async runProvisioningPipeline(): Promise<OnboardingResult> {
    const progress = { step: ONBOARDING_PIPELINE.INITIAL };
    try {
      if (!this.tenantId) {
        throw new Error('Tenant identifier missing before provisioning pipeline');
      }

      logger.info('tenant.provisioning.pipeline.start', {
        tenant_id: this.tenantId,
        slug: this.slug,
        plan: this.plan,
      });

      await this.provisionTenantStack(progress);
      const services = await this.finalizeTenantAndNotify(progress);

      return {
        success: true,
        tenantId: this.tenantId,
        services,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown onboarding error';
      logger.error('tenant.provisioning.pipeline.failed', {
        tenant_id: this.tenantId,
        slug: this.slug,
        last_completed_step: progress.step,
        error: message,
      });
      await this.rollback(progress.step).catch(() => undefined);
      await notifyTenantFailed(this.slug, message).catch(() => undefined);
      return { success: false, error: message };
    }
  }

  private async provisionTenantStack(progress: { step: number }): Promise<void> {
    this.ports = await allocatePorts(this.tenantId as string, [...PLAN_SERVICES[this.plan]]);
    progress.step = ONBOARDING_PIPELINE.AFTER_PORTS;

    const rendered = await renderTenantComposeFromTemplate(this.slug, this.ports);
    this.composePath = await writeComposeFile(this.slug, rendered.yaml);
    const structureHook = await runTenantStructureHookSafe({
      slug: this.slug,
      composePath: this.composePath,
    });
    if (!structureHook.ok) {
      console.warn('[tenant-structure-hook] warnings:', {
        slug: this.slug,
        errors: structureHook.errors,
      });
    }
    this.n8nBasicAuthUser = rendered.n8nBasicAuthUser;
    this.n8nBasicAuthPassword = rendered.n8nBasicAuthPassword;
    progress.step = ONBOARDING_PIPELINE.AFTER_COMPOSE_WRITTEN;

    await startTenant(this.slug, this.composePath);
    progress.step = ONBOARDING_PIPELINE.AFTER_COMPOSE_STARTED;
  }

  private async finalizeTenantAndNotify(progress: { step: number }): Promise<object> {
    if (!this.ports) {
      throw new Error('Ports missing before health polling');
    }

    await pollPortsUntilHealthy(this.ports);
    progress.step = ONBOARDING_PIPELINE.AFTER_HEALTH;

    await this.updateTenantActive();
    progress.step = ONBOARDING_PIPELINE.AFTER_ACTIVE_DB;

    const tenant = await this.fetchTenantRow();

    await sendPortalInvitationForTenant({
      email: tenant.owner_email,
      name: tenant.name,
      slug: tenant.slug,
    });
    progress.step = ONBOARDING_PIPELINE.AFTER_EMAIL;

    await notifyTenantCreated(tenant);
    progress.step = ONBOARDING_PIPELINE.AFTER_NOTIFY;

    return tenant.services as object;
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

  private async verifyTenantPersisted(tenantId: string): Promise<void> {
    const db = getServiceClient();
    await waitForTenantIdReadable(db, tenantId, this.slug);
  }

  private async createTenantRecord(): Promise<string> {
    const tenantId = await insertTenantProvisioningRow({
      slug: this.slug,
      email: this.email,
      plan: this.plan,
      stripeCustomerId: this.stripeCustomerId,
    });
    await this.verifyTenantPersisted(tenantId);
    logger.info('tenant.provisioning.insert.verified', {
      slug: this.slug,
      tenant_id: tenantId,
    });
    return tenantId;
  }

  private async logAudit(action: string): Promise<void> {
    if (!this.tenantId) {
      return;
    }

    const { error } = await getServiceClient()
      .schema('platform')
      .from('audit_log')
      .insert({
        tenant_id: this.tenantId,
        action,
        actor: 'onboarding-orchestrator',
        metadata: { slug: this.slug },
      });

    if (error) {
      throw new Error(`Failed to write audit log: ${error.message}`);
    }
  }

  private async updateTenantActive(): Promise<void> {
    const domain = resolveTenantServicesDomain();
    if (!this.tenantId) {
      throw new Error('Tenant not initialized');
    }
    if (this.n8nBasicAuthUser === undefined || this.n8nBasicAuthPassword === undefined) {
      throw new Error('n8n basic auth credentials missing after compose render');
    }
    if (!this.ports) {
      throw new Error('Ports missing when finalizing tenant');
    }

    // Hostnames match infra/templates/docker-compose.tenant.yml.tpl (Traefik rules).
    const services: Json = {
      n8n: `https://n8n-${this.slug}.${domain}/`,
      uptime_kuma: `https://uptime-${this.slug}.${domain}/`,
      context_builder_port: this.ports.context_builder,
      mcp_port: this.ports.mcp,
      n8n_basic_auth_user: this.n8nBasicAuthUser,
      n8n_basic_auth_password: this.n8nBasicAuthPassword,
    };

    const { error } = await getServiceClient()
      .schema('platform')
      .from('tenants')
      .update({
        status: 'active',
        progress: 100,
        services,
      })
      .eq('id', this.tenantId);

    if (error) {
      throw new Error(`Failed to finalize tenant: ${error.message}`);
    }
  }

  private async fetchTenantRow(): Promise<Tenant> {
    if (!this.tenantId) {
      throw new Error('Tenant not initialized');
    }

    const { data, error } = await getServiceClient()
      .schema('platform')
      .from('tenants')
      .select('*')
      .eq('id', this.tenantId)
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to load tenant');
    }

    return data;
  }

  private async rollback(step: number): Promise<void> {
    if (this.composePath && step >= ONBOARDING_ROLLBACK.STOP_COMPOSE_MIN_STEP) {
      await stopTenant(this.slug, this.composePath).catch(() => undefined);
    }

    if (!this.tenantId) {
      return;
    }

    if (step >= ONBOARDING_ROLLBACK.RELEASE_PORTS_MIN_STEP) {
      await releasePorts(this.tenantId).catch(() => undefined);
    }

    if (step >= ONBOARDING_ROLLBACK.MARK_FAILED_MIN_STEP) {
      await getServiceClient()
        .schema('platform')
        .from('tenants')
        .update({
          status: 'failed',
          progress: 0,
        })
        .eq('id', this.tenantId);
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
  input: ProvisionTenantInput
): Promise<{ id: string; slug: string; status: 'provisioning' }> {
  const orchestrator = new OnboardingOrchestrator(
    input.slug,
    input.owner_email,
    input.plan,
    input.stripe_customer_id
  );

  const id = await orchestrator.createAndBeginProvisioning();

  orchestrator
    .runProvisioningPipeline()
    .then(async (result) => {
      if (!result.success) {
        console.error(`[onboarding] pipeline failed for ${input.slug}: ${result.error}`);
        await getServiceClient()
          .schema('platform')
          .from('tenants')
          .update({ status: 'failed', progress: 0 })
          .eq('id', id);
      }
    })
    .catch(async (err: unknown) => {
      console.error(`[onboarding] unhandled pipeline error for ${input.slug}:`, err);
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      await getServiceClient()
        .schema('platform')
        .from('tenants')
        .update({ status: 'failed', progress: 0, metadata: { error: errMsg } })
        .eq('id', id);
    });

  return { id, slug: input.slug, status: 'provisioning' };
}

export async function deleteTenant(tenantId: string): Promise<void> {
  const db = getServiceClient();
  const { data: tenant, error: fetchError } = await db
    .schema('platform')
    .from('tenants')
    .select('id, slug')
    .eq('id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const composePath = await resolveTenantComposePath(tenant.slug);
  await stopTenant(tenant.slug, composePath).catch(() => undefined);

  const { error: updateError } = await db
    .schema('platform')
    .from('tenants')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'deleted',
    })
    .eq('id', tenant.id);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export type SuspendTenantOptions = {
  /** Si true, marca metadata para permitir reactivación automática al bajar el gasto. */
  readonly budgetAutoSuspended?: boolean;
};

export async function suspendTenant(
  tenantId: string,
  actor = 'platform-api',
  options?: SuspendTenantOptions
): Promise<void> {
  const db = getServiceClient();
  const { data: tenant, error: fetchError } = await db
    .schema('platform')
    .from('tenants')
    .select('id, slug, metadata')
    .eq('id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const composePath = await resolveTenantComposePath(tenant.slug);
  await stopTenant(tenant.slug, composePath).catch(() => undefined);

  const updatePayload: { status: 'suspended'; metadata?: Json } = {
    status: 'suspended',
  };
  if (options?.budgetAutoSuspended === true) {
    updatePayload.metadata = mergeBudgetAutoSuspendFlag(tenant.metadata as Json);
  }

  const { error: updateError } = await db
    .schema('platform')
    .from('tenants')
    .update(updatePayload)
    .eq('id', tenant.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: auditError } = await db
    .schema('platform')
    .from('audit_log')
    .insert({
      tenant_id: tenant.id,
      action: 'suspended',
      actor,
      metadata: { slug: tenant.slug },
    });

  if (auditError) {
    throw new Error(auditError.message);
  }
}

type TenantResumeRow = {
  id: string;
  slug: string;
  status: string;
};

async function loadSuspendedTenantOrThrow(tenantId: string): Promise<TenantResumeRow> {
  const db = getServiceClient();
  const { data: tenant, error: fetchError } = await db
    .schema('platform')
    .from('tenants')
    .select('id, slug, status')
    .eq('id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!tenant) {
    throw new Error('Tenant not found');
  }
  if (tenant.status !== 'suspended') {
    throw new Error('Tenant is not suspended');
  }
  return tenant;
}

async function markTenantDeployingProgress(tenantId: string): Promise<void> {
  const db = getServiceClient();
  const { error: deployingError } = await db
    .schema('platform')
    .from('tenants')
    .update({ status: 'deploying', progress: 50 })
    .eq('id', tenantId);

  if (deployingError) {
    throw new Error(deployingError.message);
  }
}

async function buildPortsMapForTenant(tenantId: string): Promise<Record<string, number>> {
  const db = getServiceClient();
  const { data: portsRows, error: portsError } = await db
    .schema('platform')
    .from('port_allocations')
    .select('port, service')
    .eq('tenant_id', tenantId);

  if (portsError) {
    throw new Error(portsError.message);
  }

  const ports: Record<string, number> = {};
  for (const row of portsRows ?? []) {
    if (row.service === 'available') {
      continue;
    }
    ports[row.service] = row.port;
  }
  return ports;
}

async function markTenantActiveAndLogResume(tenant: TenantResumeRow): Promise<void> {
  const db = getServiceClient();
  const { data: metaRow, error: metaErr } = await db
    .schema('platform')
    .from('tenants')
    .select('metadata')
    .eq('id', tenant.id)
    .maybeSingle();

  if (metaErr) {
    throw new Error(metaErr.message);
  }

  const clearedMetadata = stripBudgetAutoSuspendFlag((metaRow?.metadata ?? null) as Json);

  const { error: activeError } = await db
    .schema('platform')
    .from('tenants')
    .update({
      status: 'active',
      progress: 100,
      metadata: clearedMetadata,
    })
    .eq('id', tenant.id);

  if (activeError) {
    throw new Error(activeError.message);
  }

  const { error: auditError } = await db
    .schema('platform')
    .from('audit_log')
    .insert({
      tenant_id: tenant.id,
      action: 'resumed',
      actor: 'platform-api',
      metadata: { slug: tenant.slug },
    });

  if (auditError) {
    throw new Error(auditError.message);
  }
}

export async function resumeTenant(tenantId: string): Promise<void> {
  const tenant = await loadSuspendedTenantOrThrow(tenantId);
  await markTenantDeployingProgress(tenant.id);

  const composePath = await resolveTenantComposePath(tenant.slug);
  await startTenant(tenant.slug, composePath);

  const ports = await buildPortsMapForTenant(tenant.id);
  await pollPortsUntilHealthy(ports);
  await markTenantActiveAndLogResume(tenant);
}
