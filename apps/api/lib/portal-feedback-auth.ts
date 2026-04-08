import { HTTP_STATUS } from "./constants";
import { getUserFromAuthorizationHeader } from "./portal-auth";
import {
  fetchPortalTenantRowBySlug,
  readPortalTenantSlugFromUser,
  type PortalTenantRow,
} from "./portal-me";

export type TrustedFeedbackIdentity = {
  tenant_slug: string;
  user_email: string;
};

type ResolveFail = { ok: false; response: Response };
type ResolveOk = { ok: true; identity: TrustedFeedbackIdentity };

function jsonFail(status: number, error: string): ResolveFail {
  return { ok: false, response: Response.json({ error }, { status }) };
}

async function tenantRowForFeedback(
  slug: string,
): Promise<ResolveFail | { ok: true; row: PortalTenantRow }> {
  const lookup = await fetchPortalTenantRowBySlug(slug);
  if (!lookup.ok) {
    const status =
      lookup.reason === "db"
        ? HTTP_STATUS.INTERNAL_ERROR
        : HTTP_STATUS.NOT_FOUND;
    const message =
      lookup.reason === "db" ? "Internal server error" : "Tenant not found";
    return jsonFail(status, message);
  }
  return { ok: true, row: lookup.row };
}

/**
 * Zero-trust: identidad de feedback solo desde JWT + fila `platform.tenants`
 * (misma lógica que GET /api/portal/me). No confiar en tenant_slug/user_email del cuerpo.
 */
export async function resolveTrustedFeedbackIdentity(
  request: Request,
): Promise<ResolveOk | ResolveFail> {
  const user = await getUserFromAuthorizationHeader(request);
  if (!user) {
    return jsonFail(HTTP_STATUS.UNAUTHORIZED, "Unauthorized");
  }

  const slug = readPortalTenantSlugFromUser(user);
  if (!slug) {
    return jsonFail(
      HTTP_STATUS.FORBIDDEN,
      "No tenant associated with this account",
    );
  }

  const emailNorm = user.email?.toLowerCase() ?? "";
  if (emailNorm.length === 0) {
    return jsonFail(HTTP_STATUS.FORBIDDEN, "Forbidden");
  }

  const tenant = await tenantRowForFeedback(slug);
  if (!tenant.ok) {
    return tenant;
  }

  if (tenant.row.owner_email.toLowerCase() !== emailNorm) {
    return jsonFail(HTTP_STATUS.FORBIDDEN, "Forbidden");
  }

  return {
    ok: true,
    identity: {
      tenant_slug: slug,
      user_email: tenant.row.owner_email,
    },
  };
}
