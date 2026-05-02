import { z } from 'zod';

const NAME_MAX = 200;
const EMAIL_MAX = 320;
const PHONE_MAX = 50;
const NOTES_MAX = 2000;

export const publicBookBodySchema = z.object({
  customer_name: z.string().min(1).max(NAME_MAX),
  customer_email: z.string().email().max(EMAIL_MAX),
  customer_phone: z.string().max(PHONE_MAX).optional(),
  service_id: z.string().uuid().optional(),
  scheduled_at: z.string().datetime().optional(),
  notes: z.string().max(NOTES_MAX).optional(),
});
