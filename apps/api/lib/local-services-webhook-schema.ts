import { z } from 'zod';
import { LS_WEBHOOK_EVENT_MAX_LEN } from './local-services-webhook-constants';

const LS_WEBHOOK_UUID = z.string().uuid();
const LS_REPORT_TITLE_MAX = 500;

export const lsWebhookBookingBodySchema = z.object({
  booking_id: LS_WEBHOOK_UUID,
  event: z.string().max(LS_WEBHOOK_EVENT_MAX_LEN).optional(),
});

export const lsWebhookBookingCompletedBodySchema = z.object({
  booking_id: LS_WEBHOOK_UUID,
  status: z.literal('completed').optional(),
});

export const lsWebhookReportCreateBodySchema = z.object({
  title: z.string().min(1).max(LS_REPORT_TITLE_MAX),
  body: z.record(z.string(), z.unknown()).optional(),
});
