import { proxyToPlatformApi, withLegacyTenantIdOnPost } from '../../../lib/proxy-platform-api';

export function GET(request: Request): Promise<Response> {
  return proxyToPlatformApi({ request, apiPath: '/api/tenants' });
}

export async function POST(request: Request): Promise<Response> {
  const res = await proxyToPlatformApi({ request, apiPath: '/api/tenants' });
  return withLegacyTenantIdOnPost(res);
}
