export interface WhatsAppEvent {
  tenantSlug: string;
  from: string;
  message: string;
}

export async function handleWhatsAppEvent(event: WhatsAppEvent): Promise<void> {
  const summary = {
    tenant: event.tenantSlug,
    from: event.from,
    messageSize: event.message.length
  };
  process.stdout.write(`[ml] whatsapp event: ${JSON.stringify(summary)}\n`);
}
