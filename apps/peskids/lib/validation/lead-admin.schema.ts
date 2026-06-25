import { z } from 'zod';

export const adminLeadStatusSchema = z.enum([
  'new',
  'contacted',
  'trial',
  'enrolled',
  'archived',
]);

export const patchLeadAdminSchema = z
  .object({
    status: adminLeadStatusSchema.optional(),
    admin_notes: z.string().trim().max(2000).optional(),
  })
  .refine((value) => value.status !== undefined || value.admin_notes !== undefined, {
    message: 'At least one of status or admin_notes is required',
  });

export type AdminLeadStatus = z.infer<typeof adminLeadStatusSchema>;
export type PatchLeadAdminInput = z.infer<typeof patchLeadAdminSchema>;
