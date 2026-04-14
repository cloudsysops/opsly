import { z } from 'zod';
import { jsonError, parseJsonBody } from '../../../lib/api-response';
import { requireAdminAccess } from '../../../lib/auth';
import { HTTP_STATUS } from '../../../lib/constants';
import { executeAdminInvitation } from '../../../lib/invitation-admin-flow';
import { formatZodError } from '../../../lib/validation';

const MAX_NAME_LENGTH = 200;

const slugPattern = /^[a-z0-9-]{3,30}$/;

const InvitationBodySchema = z
  .object({
    slug: z.string().regex(slugPattern).optional(),
    tenantRef: z.string().regex(slugPattern).optional(),
    email: z.string().email(),
    name: z.string().min(1).max(MAX_NAME_LENGTH).optional(),
    mode: z.enum(['developer', 'managed']).optional(),
  })
  .refine((b) => Boolean(b.slug ?? b.tenantRef), {
    message: 'Provide slug or tenantRef',
    path: ['slug'],
  });

export async function POST(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = InvitationBodySchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
  }

  return executeAdminInvitation(parsed.data);
}
