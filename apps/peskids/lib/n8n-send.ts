/** Encola envío aprobado vía n8n (WhatsApp / Instagram). */

export async function enqueueApprovedReply(params: {
  messageId: string;
  source: string;
  sender_contact: string;
  reply_text: string;
}): Promise<{ ok: boolean; detail: string }> {
  const base = process.env.N8N_WEBHOOK_BASE_URL?.replace(/\/$/, '');
  if (!base) {
    return { ok: false, detail: 'N8N_WEBHOOK_BASE_URL not configured' };
  }

  const url = `${base}/peskids-send-approved`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_id: params.messageId,
        source: params.source,
        to: params.sender_contact,
        text: params.reply_text,
        tenant_id: process.env.NEXT_PUBLIC_TENANT_ID || 'peskids',
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      return { ok: false, detail: `n8n returned ${res.status}` };
    }
    return { ok: true, detail: 'queued in n8n' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, detail: msg };
  }
}
