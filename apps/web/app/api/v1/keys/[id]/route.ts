import { proxyToPlatformApi } from '../../../../../lib/proxy-platform-api';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await context.params;
  return proxyToPlatformApi({
    request,
    apiPath: `/api/v1/keys/${encodeURIComponent(id)}`,
  });
}
