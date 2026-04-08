import type { TokenPayload } from "./tokens.js";
import { verifyAccessToken } from "./tokens.js";

export type MCPAuthResult =
  | { authorized: true; payload: TokenPayload }
  | { authorized: false };

const ADMIN_FUTURE_EXP = Math.floor(Date.now() / 1000) + 86400 * 365 * 10;

function adminPayload(): TokenPayload {
  return {
    sub: "admin",
    scope: ["*"],
    iat: 0,
    exp: ADMIN_FUTURE_EXP,
  };
}

export function requireMCPAuth(authHeader: string | undefined, requiredScope?: string): MCPAuthResult {
  if (!authHeader?.startsWith("Bearer ")) {
    return { authorized: false };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const admin = process.env.PLATFORM_ADMIN_TOKEN?.trim() ?? "";

  if (admin.length > 0 && token === admin) {
    return { authorized: true, payload: adminPayload() };
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return { authorized: false };
  }

  if (requiredScope && !payload.scope.includes("*") && !payload.scope.includes(requiredScope)) {
    return { authorized: false };
  }

  return { authorized: true, payload };
}
