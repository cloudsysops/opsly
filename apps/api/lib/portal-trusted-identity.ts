import type { User } from "@supabase/supabase-js";
import { HTTP_STATUS } from "./constants";
import { getUserFromAuthorizationHeader } from "./portal-auth";
import {
  fetchPortalTenantRowBySlug,
  readPortalTenantSlugFromUser,
  type PortalTenantRow,
} from "./portal-me";

/** Sesión portal verificada: JWT + `platform.tenants.owner_email` alineado al usuario. */
export type TrustedPortalSession = {
  user: User;
  tenant: PortalTenantRow;
};

type Fail = { ok: false; response: Response };
type Ok = { ok: true; session: TrustedPortalSession };

function jsonFail(status: number, error: string): Fail {
  return { ok: false, response: Response.json({ error }, { status }) };
}

/**
 * Zero-trust base para rutas portal: misma regla que `GET /api/portal/me`.
 * Reutilizar en feedback, mode, y futuras rutas bajo `/api/portal/*`.
 */
export async function resolveTrustedPortalSession(
  request: Request,
): Promise<Ok | Fail> {
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

  if (lookup.row.owner_email.toLowerCase() !== emailNorm) {
    return jsonFail(HTTP_STATUS.FORBIDDEN, "Forbidden");
  }

  return {
    ok: true,
    session: { user, tenant: lookup.row },
  };
}
