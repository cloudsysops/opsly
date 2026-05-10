import {
  mapApiStatusToLegacySuccess,
  proxyToPlatformApi,
} from '../../../../../lib/proxy-platform-api';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await context.params;
  const res = await proxyToPlatformApi({
    request,
    apiPath: `/api/tenants/${encodeURIComponent(id)}/resume`,
  });
  return mapApiStatusToLegacySuccess(res);
}
