import {
  mapStackStatusToContainerStatus,
  proxyToPlatformApi,
} from '../../../../lib/proxy-platform-api';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await context.params;
  const res = await proxyToPlatformApi({
    request,
    apiPath: `/api/tenants/${encodeURIComponent(id)}`,
  });
  return mapStackStatusToContainerStatus(res);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await context.params;
  return proxyToPlatformApi({
    request,
    apiPath: `/api/tenants/${encodeURIComponent(id)}`,
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await context.params;
  return proxyToPlatformApi({
    request,
    apiPath: `/api/tenants/${encodeURIComponent(id)}`,
  });
}
