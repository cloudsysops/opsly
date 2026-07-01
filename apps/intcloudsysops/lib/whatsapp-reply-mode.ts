export type WhatsAppReplyMode = 'auto' | 'draft';

function normalize(value: string | undefined | null): WhatsAppReplyMode {
  const raw = value?.trim().toLowerCase();
  if (!raw) return 'auto';
  if (['draft', 'manual', 'approval-first', 'false', '0', 'off'].includes(raw)) {
    return 'draft';
  }
  return 'auto';
}

export function getPeskidsWhatsAppReplyMode(): WhatsAppReplyMode {
  return normalize(
    process.env.PESKIDS_WHATSAPP_REPLY_MODE || process.env.PESKIDS_WHATSAPP_AUTO_REPLY_ENABLED
  );
}

export function shouldAutoReplyWhatsApp(): boolean {
  return getPeskidsWhatsAppReplyMode() === 'auto';
}
