import { jsonError } from "./api-response";
import { HTTP_STATUS } from "./constants";

export function isPublicDemoRead(): boolean {
  return process.env.ADMIN_PUBLIC_DEMO_READ === "true";
}

/**
 * GET público solo cuando ADMIN_PUBLIC_DEMO_READ=true (demo familia).
 * Mutaciones siguen usando requireAdminToken.
 */
export function requireAdminTokenUnlessDemoRead(
  request: Request,
): Response | null {
  if (request.method === "GET" && isPublicDemoRead()) {
    return null;
  }
  return requireAdminToken(request);
}

export function requireAdminToken(request: Request): Response | null {
  const expected = process.env.PLATFORM_ADMIN_TOKEN;
  if (!expected || expected.length === 0) {
    return jsonError(
      "Server misconfiguration: PLATFORM_ADMIN_TOKEN is not set",
      HTTP_STATUS.INTERNAL_ERROR,
    );
  }

  const auth = request.headers.get("authorization");
  const bearer =
    auth?.startsWith("Bearer ") === true
      ? auth.slice("Bearer ".length).trim()
      : "";
  const headerToken = request.headers.get("x-admin-token")?.trim() ?? "";
  const token = bearer.length > 0 ? bearer : headerToken;

  if (token.length === 0 || token !== expected) {
    return jsonError("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
  }

  return null;
}
