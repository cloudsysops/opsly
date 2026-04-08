/** OAuth 2.0 Authorization Server Metadata (RFC 8414-style fields used by MCP auth). */

export const MCP_OAUTH_SCOPES_SUPPORTED = [
  "tenants:read",
  "tenants:write",
  "metrics:read",
  "invitations:write",
  "executor:write",
] as const;

export function buildAuthorizationServerMetadata(baseUrl: string): Record<string, unknown> {
  const base = baseUrl.replace(/\/$/, "");
  return {
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: [...MCP_OAUTH_SCOPES_SUPPORTED],
  };
}
