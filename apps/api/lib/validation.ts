import { z } from 'zod';
import { LIST_TENANTS, TENANT_ROUTE_REF } from './constants';

const tenantStatusEnum = z.enum([
  'provisioning',
  'configuring',
  'deploying',
  'active',
  'suspended',
  'failed',
  'deleted',
]);

const planEnum = z.enum(['startup', 'business', 'enterprise', 'demo']);

export const CreateTenantSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,30}$/),
  owner_email: z.string().email(),
  plan: planEnum,
  stripe_customer_id: z.string().min(1).optional(),
});

export const ListTenantsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_TENANTS.MAX_LIMIT)
    .default(LIST_TENANTS.DEFAULT_LIMIT),
  status: tenantStatusEnum.optional(),
  plan: planEnum.optional(),
});

export const TenantRefParamSchema = z.union([
  z.string().uuid(),
  z
    .string()
    .min(TENANT_ROUTE_REF.SLUG_MIN_LEN)
    .max(TENANT_ROUTE_REF.SLUG_MAX_LEN)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
]);

export const UpdateTenantSchema = z
  .object({
    name: z.string().min(1).optional(),
    plan: planEnum.optional(),
  })
  .refine((v) => v.name !== undefined || v.plan !== undefined, {
    message: 'At least one of name or plan is required',
  });

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.') || 'root'}: ${i.message}`).join('; ');
}
