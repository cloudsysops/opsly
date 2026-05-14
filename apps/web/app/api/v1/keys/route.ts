import { proxyToPlatformApi } from '../../../../lib/proxy-platform-api';

export function GET(request: Request): Promise<Response> {
  return proxyToPlatformApi({ request, apiPath: '/api/v1/keys' });
}

export function POST(request: Request): Promise<Response> {
  return proxyToPlatformApi({ request, apiPath: '/api/v1/keys' });
}
