import { requireAiGatewayOrAdminAccess } from '../../../../lib/auth';
import { runAiGatewayChat, safeGatewayErrorMessage } from '../../../../lib/ai-gateway/gateway';
import { parseAiChatJsonBody } from '../../../../lib/ai-gateway/parse-ai-chat-body';
import { HTTP_STATUS } from '../../../../lib/constants';
import { parseJsonBody, tryRoute } from '../../../../lib/api-response';

export async function POST(request: Request): Promise<Response> {
  return tryRoute('POST /api/ai/chat', async () => {
    const auth = await requireAiGatewayOrAdminAccess(request);
    if (auth) {
      return auth;
    }

    const parsed = await parseJsonBody(request);
    if (!parsed.ok) {
      return parsed.response;
    }
    const body = parsed.body as Record<string, unknown>;
    const chatParsed = parseAiChatJsonBody(body);
    if (!chatParsed.ok) {
      return chatParsed.response;
    }

    try {
      const out = await runAiGatewayChat(chatParsed.chat);
      return Response.json({
        ok: true,
        provider: out.provider,
        model: out.model,
        content: out.content,
        client_model: out.client_model ?? null,
        opsly_alias: out.opsly_alias ?? null,
      });
    } catch (err) {
      const safe = safeGatewayErrorMessage(err);
      return Response.json({ ok: false, error: safe }, { status: HTTP_STATUS.BAD_REQUEST });
    }
  });
}
