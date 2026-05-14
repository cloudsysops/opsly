import { proxyToPlatformApi } from '../../../lib/proxy-platform-api';

export function GET(request: Request): Promise<Response> {
  return proxyToPlatformApi({ request, apiPath: '/api/health' });
}
