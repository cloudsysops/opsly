import { requireAdminAccessUnlessDemoRead } from '../../../../../lib/auth';
import { proxyRuntimeOrchestrator } from '../../../../../lib/runtime-proxy';
import { extractIp, logAuditEvent } from '../../../../../lib/audit';
import { checkRateLimit } from '../../../../../lib/rate-limiter';

export const dynamic = 'force-dynamic';

interface VoiceMessageFields {
  audioBlob: Blob;
  senderContact: string;
  senderName: string;
  channel: string;
}

function validateVoiceMessageFields(formData: FormData): VoiceMessageFields | null {
  const audioBlob = formData.get('audio') as Blob | null;
  const senderContact = formData.get('senderContact') as string | null;
  const senderName = formData.get('senderName') as string | null;
  const channel = formData.get('channel') as string | null;

  if (!audioBlob || !senderContact || !senderName || !channel) {
    return null;
  }
  return { audioBlob, senderContact, senderName, channel };
}

export async function POST(request: Request): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) return authError;

  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(
    ip ? `voice-message-post:${ip}` : 'voice-message-post:anonymous'
  );

  if (!rateLimit.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const fields = validateVoiceMessageFields(await request.formData());
    if (!fields) {
      return Response.json(
        { error: 'Missing required fields: audio, senderContact, senderName, channel' },
        { status: 400 }
      );
    }

    const { audioBlob, senderContact, senderName, channel } = fields;
    const newFormData = new FormData();
    newFormData.append('audio', audioBlob);
    newFormData.append('senderContact', senderContact);
    newFormData.append('senderName', senderName);
    newFormData.append('channel', channel);

    const response = await proxyRuntimeOrchestrator('/internal/voice/messages/voice', {
      method: 'POST',
      body: newFormData,
    });

    if (response.ok) {
      void logAuditEvent({
        action: 'voice_message_post',
        resource: `voice:messages:${senderContact}`,
        ip,
        user_agent: request.headers.get('user-agent') ?? undefined,
        metadata: { senderContact, senderName, channel },
      });
    }

    return response;
  } catch (error) {
    console.error('Error processing voice message:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
