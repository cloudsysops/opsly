import { z } from "zod";
import type { User } from "@supabase/supabase-js";
import { jsonError, parseJsonBody } from "./api-response";
import { HTTP_STATUS } from "./constants";
import { logger } from "./logger";
import { getUserFromAuthorizationHeader } from "./portal-auth";
import { getServiceClient } from "./supabase";
import { TenantBootstrapper } from "./tenant-bootstrapper";

const LIMITS = {
  ORG_NAME_MIN: 2,
  ORG_NAME_MAX: 60,
  SLUG_MIN: 3,
  SLUG_MAX: 30,
} as const;

const OnboardingBodySchema = z.object({
  org_name: z
    .string()
    .min(LIMITS.ORG_NAME_MIN)
    .max(LIMITS.ORG_NAME_MAX)
    .trim(),
  slug: z
    .string()
    .regex(
      new RegExp(
        `^[a-z0-9-]{${String(LIMITS.SLUG_MIN)},${String(LIMITS.SLUG_MAX)}}$`,
      ),
    ),
  plan: z.enum(["startup", "business", "enterprise"]).default("startup"),
});

function isUniqueViolation(message: string, code: string | undefined): boolean {
  return (
    code === "23505" ||
    message.includes("duplicate key") ||
    message.includes("unique constraint")
  );
}

async function checkSlugAvailable(
  db: ReturnType<typeof getServiceClient>,
  slug: string,
): Promise<boolean> {
  const { data } = await db
    .schema("platform")
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data === null;
}

async function checkUserHasTenant(
  db: ReturnType<typeof getServiceClient>,
  email: string,
): Promise<boolean> {
  const { data } = await db
    .schema("platform")
    .from("tenants")
    .select("id, slug")
    .eq("owner_email", email)
    .is("deleted_at", null)
    .maybeSingle();
  return data !== null;
}

async function createTenant(
  db: ReturnType<typeof getServiceClient>,
  orgName: string,
  slug: string,
  email: string,
  plan: string,
): Promise<{ id: string } | { error: string; code?: string }> {
  const { data, error } = await db
    .schema("platform")
    .from("tenants")
    .insert({
      slug,
      name: orgName,
      owner_email: email,
      plan,
      status: "provisioning",
      progress: 0,
    })
    .select("id")
    .single();

  if (error ?? !data) {
    return { error: error?.message ?? "Failed to create tenant", code: error?.code };
  }
  return { id: data.id };
}

async function updateUserMetadata(
  db: ReturnType<typeof getServiceClient>,
  userId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await db.auth.admin.updateUserById(userId, { user_metadata: metadata });
  if (error) {
    logger.error("onboarding meta update", { msg: error.message });
  }
}

/** null = OK; Response = conflicto u error temprano. */
async function assertCanCreateTenant(
  db: ReturnType<typeof getServiceClient>,
  slug: string,
  email: string,
): Promise<Response | null> {
  if (!(await checkSlugAvailable(db, slug))) {
    return jsonError("Este identificador ya está en uso, elige otro", HTTP_STATUS.CONFLICT);
  }
  if (await checkUserHasTenant(db, email)) {
    return jsonError("Ya tienes una organización registrada", HTTP_STATUS.CONFLICT);
  }
  return null;
}

async function buildOnboardingSuccessResponse(
  user: User,
  tenantId: string,
  slug: string,
  orgName: string,
  plan: string,
  bootstrapper: TenantBootstrapper,
): Promise<Response> {
  const bootstrap = await bootstrapper.provisionResources(tenantId);

  const prevMeta =
    user.user_metadata !== null &&
    typeof user.user_metadata === "object" &&
    !Array.isArray(user.user_metadata)
      ? { ...(user.user_metadata as Record<string, unknown>) }
      : {};

  const db = getServiceClient();
  await updateUserMetadata(db, user.id, { ...prevMeta, tenant_slug: slug });

  return Response.json({
    ok: true,
    tenant_id: tenantId,
    slug,
    org_name: orgName,
    plan,
    bootstrap: {
      workers_deployed: bootstrap.workersDeployed,
      job_name: bootstrap.job.jobName,
    },
  });
}

type ValidatedOnboardingBody =
  | { ok: true; data: z.infer<typeof OnboardingBodySchema> }
  | { ok: false; response: Response };

async function readValidatedOnboardingBody(
  request: Request,
): Promise<ValidatedOnboardingBody> {
  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) {
    return { ok: false, response: parsedBody.response };
  }

  const validation = OnboardingBodySchema.safeParse(parsedBody.body);
  if (!validation.success) {
    const msg = validation.error.issues[0]?.message ?? "Invalid input";
    return { ok: false, response: jsonError(msg, HTTP_STATUS.BAD_REQUEST) };
  }

  return { ok: true, data: validation.data };
}

async function readOnboardingSession(
  request: Request,
): Promise<
  | { ok: true; user: User; email: string; body: z.infer<typeof OnboardingBodySchema> }
  | { ok: false; response: Response }
> {
  const user = await getUserFromAuthorizationHeader(request);
  if (!user) {
    return { ok: false, response: jsonError("Unauthorized", HTTP_STATUS.UNAUTHORIZED) };
  }
  const email = user.email?.toLowerCase() ?? "";
  if (email.length === 0) {
    return {
      ok: false,
      response: jsonError("Forbidden: no email in session", HTTP_STATUS.FORBIDDEN),
    };
  }
  const body = await readValidatedOnboardingBody(request);
  if (!body.ok) {
    return { ok: false, response: body.response };
  }
  return { ok: true, user, email, body: body.data };
}

function responseForTenantInsertFailure(
  tenantResult: { error: string; code?: string },
): Response {
  const msg = tenantResult.error;
  if (isUniqueViolation(msg, tenantResult.code)) {
    return jsonError("Este identificador ya está en uso, elige otro", HTTP_STATUS.CONFLICT);
  }
  logger.error("onboarding insert", { msg });
  return jsonError("Error al crear la organización", HTTP_STATUS.INTERNAL_ERROR);
}

/**
 * POST /api/portal/onboarding — cuerpo principal (sin tryRoute).
 */
export async function processPortalOnboardingPost(request: Request): Promise<Response> {
  const session = await readOnboardingSession(request);
  if (!session.ok) {
    return session.response;
  }

  const { user, email, body } = session;
  const { org_name, slug, plan } = body;
  const db = getServiceClient();

  const blocked = await assertCanCreateTenant(db, slug, email);
  if (blocked !== null) {
    return blocked;
  }

  const tenantResult = await createTenant(db, org_name, slug, email, plan);
  if ("error" in tenantResult) {
    return responseForTenantInsertFailure(tenantResult);
  }

  const bootstrapper = new TenantBootstrapper();
  return buildOnboardingSuccessResponse(
    user,
    tenantResult.id,
    slug,
    org_name,
    plan,
    bootstrapper,
  );
}
