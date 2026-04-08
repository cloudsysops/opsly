import { createHmac, randomBytes } from "node:crypto";

export interface TokenPayload {
  sub: string;
  scope: string[];
  tenant_slug?: string;
  iat: number;
  exp: number;
}

const MIN_SECRET_LEN = 32;

function getJwtSigningSecret(): string {
  const fromJwt = process.env.MCP_JWT_SECRET?.trim() ?? "";
  if (fromJwt.length >= MIN_SECRET_LEN) {
    return fromJwt;
  }
  const fromAdmin = process.env.PLATFORM_ADMIN_TOKEN?.trim() ?? "";
  if (fromAdmin.length >= MIN_SECRET_LEN) {
    return fromAdmin;
  }
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") {
    return "test-mcp-jwt-secret-min-32-chars!!";
  }
  throw new Error(
    "Set MCP_JWT_SECRET (preferred) or PLATFORM_ADMIN_TOKEN with length >= 32 for MCP OAuth JWT signing",
  );
}

export function generateAccessToken(
  clientId: string,
  scopes: string[],
  tenantSlug?: string,
  expiresInSeconds = 3600,
): string {
  const secret = getJwtSigningSecret();
  const payload: TokenPayload = {
    sub: clientId,
    scope: scopes,
    tenant_slug: tenantSlug,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${sig}`;
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const secret = getJwtSigningSecret();
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expected = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");

    if (expected !== sig) return null;

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;

    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export function generateAuthCode(): string {
  return randomBytes(32).toString("base64url");
}
