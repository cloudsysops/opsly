import { z } from 'zod';

export const inboundWebhookSchema = z
  .object({
    source: z.enum(['whatsapp', 'instagram', 'web']).optional(),
    from: z.string().optional(),
    sender_contact: z.string().optional(),
    name: z.string().optional(),
    sender_name: z.string().optional(),
    text: z.string().optional(),
    message: z.string().optional(),
    message_text: z.string().optional(),
    messageId: z.string().optional(),
    external_id: z.string().optional(),
    timestamp: z.string().optional(),
  })
  .strict();

export type InboundWebhookInput = z.infer<typeof inboundWebhookSchema>;
