import { requireAdminAccessUnlessDemoRead } from '../../../../../lib/auth';
import { proxyRuntimeOrchestrator } from '../../../../../lib/runtime-proxy';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) {
    return authError;
  }

  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob | null;
    const senderContact = formData.get('senderContact') as string;
    const senderName = formData.get('senderName') as string;
    const channel = formData.get('channel') as string;

    if (!audioBlob || !senderContact || !senderName || !channel) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: audio, senderContact, senderName, channel',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const newFormData = new FormData();
    newFormData.append('audio', audioBlob);
    newFormData.append('senderContact', senderContact);
    newFormData.append('senderName', senderName);
    newFormData.append('channel', channel);

    return proxyRuntimeOrchestrator('/internal/voice/messages/voice', {
      method: 'POST',
      body: newFormData,
    });
  } catch (error) {
    console.error('Error processing voice message:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
