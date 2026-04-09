import { respondTrustedPortalMe } from "../../../../lib/portal-me-json";
import { resolveTrustedPortalSession } from "../../../../lib/portal-trusted-identity";

export async function GET(request: Request): Promise<Response> {
  const trusted = await resolveTrustedPortalSession(request);
  if (!trusted.ok) {
    return trusted.response;
  }

  return respondTrustedPortalMe(trusted.session);
}
