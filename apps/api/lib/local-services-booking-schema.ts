import { z } from 'zod';
import { TECHNICIAN_COMPLETE_SCHEMA } from './constants';

const NAME_MAX = 200;
const EMAIL_MAX = 320;
const PHONE_MAX = 50;
const NOTES_MAX = 2000;
const ADDRESS_MAX = 500;
const TRAVEL_TIME_MAX_MINUTES =
  TECHNICIAN_COMPLETE_SCHEMA.HOURS_PER_DAY * TECHNICIAN_COMPLETE_SCHEMA.MINUTES_PER_HOUR;
const EQUIPMENT_STRING_MAX = TECHNICIAN_COMPLETE_SCHEMA.EQUIPMENT_STRING_MAX;
const EQUIPMENT_MAX_COUNT = TECHNICIAN_COMPLETE_SCHEMA.EQUIPMENT_MAX_COUNT;

export const technicianServiceExternalIdSchema = z.enum([
  'pc-cleanup',
  'gaming-optimization',
  'office-support',
]);

export const publicBookBodySchema = z
  .object({
    customer_name: z.string().min(1).max(NAME_MAX),
    customer_email: z.string().email().max(EMAIL_MAX),
    customer_phone: z.string().max(PHONE_MAX).optional(),
    service_id: z.string().uuid().optional(),
    /** Technician profile: resolve ls_services row by (tenant_slug, external_key). */
    service_external_id: technicianServiceExternalIdSchema.optional(),
    scheduled_at: z.string().datetime().optional(),
    notes: z.string().max(NOTES_MAX).optional(),
    service_location: z.enum(['home', 'office', 'other']).optional(),
    address: z.string().min(1).max(ADDRESS_MAX).optional(),
    latitude: z.number().finite().optional(),
    longitude: z.number().finite().optional(),
    estimated_travel_time_minutes: z.number().int().min(0).max(TRAVEL_TIME_MAX_MINUTES).optional(),
    equipment_needed: z
      .array(z.string().max(EQUIPMENT_STRING_MAX))
      .max(EQUIPMENT_MAX_COUNT)
      .optional(),
  })
  .refine((v) => !(v.service_id !== undefined && v.service_external_id !== undefined), {
    message: 'Provide only one of service_id or service_external_id',
  });
