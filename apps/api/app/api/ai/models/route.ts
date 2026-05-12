import { requireAiGatewayOrAdminAccess } from '../../../../lib/auth';
import { buildPublicAiModelsPayload } from '../../../../lib/ai-gateway/public-model-config';
import { resolveNvidiaDefaultModel } from '../../../../lib/ai-gateway/providers/nvidia';
import { tryRoute } from '../../../../lib/api-response';

export async function GET(request: Request): Promise<Response> {
  return tryRoute('GET /api/ai/models', async () => {
    const auth = await requireAiGatewayOrAdminAccess(request);
    if (auth) {
      return auth;
    }
    const defaultChatModel = resolveNvidiaDefaultModel();
    return Response.json(buildPublicAiModelsPayload(defaultChatModel));
  });
}
