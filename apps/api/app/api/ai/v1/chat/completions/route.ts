import { requireAiGatewayOrAdminAccess } from '../../../../../../lib/auth';
import { runAiGatewayChat, safeGatewayErrorMessage } from '../../../../../../lib/ai-gateway/gateway';
import { buildOpenAiChatCompletionPayload, responseModelForOpenAiClient } from '../../../../../../lib/ai-gateway/openai-chat-completion-response';
import { parseAiChatJsonBody } from '../../../../../../lib/ai-gateway/parse-ai-chat-body';
import { HTTP_STATUS } from '../../../../../../lib/constants';
import { parseJsonBody, tryRoute } from '../../../../../../lib/api-response';

export async function POST(request: Request): Promise<Response> {
  return tryRoute('POST /api/ai/v1/chat/completions', async () => {
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
      const responseModel = responseModelForOpenAiClient(chatParsed.chat, out);
      const payload = buildOpenAiChatCompletionPayload({
        responseModel,
        content: out.content,
        usage: out.usage,
      });
      return Response.json(payload);
    } catch (err) {
      const safe = safeGatewayErrorMessage(err);
      return Response.json(
        { error: { message: safe, type: 'invalid_request_error' } },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }
  });
}
