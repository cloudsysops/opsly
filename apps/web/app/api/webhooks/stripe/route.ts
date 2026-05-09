import { proxyToPlatformApi } from '../../../../lib/proxy-platform-api';

export function POST(request: Request): Promise<Response> {
  return proxyToPlatformApi({ request, apiPath: '/api/webhooks/stripe' });
}
