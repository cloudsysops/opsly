import { adminAuth } from '@intcloudsysops/security';
import { z } from 'zod';
import { assignFormToFranchise } from '@/lib/services/franchise-forms.service';

const assignFormSchema = z.object({
  franchiseTenantId: z.string().uuid(),
  templateId: z.string().uuid(),
  customName: z.string().optional(),
  customDescription: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

/**
 * POST /api/admin/franchises/forms
 * Admin endpoint to assign form templates to franchises
 */
export async function POST(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    await adminAuth(req);

    const body = await req.json();
    const { franchiseTenantId, templateId, customName, customDescription, isPrimary } =
      assignFormSchema.parse(body);

    const result = await assignFormToFranchise({
      franchiseTenantId,
      templateId,
      customName,
      customDescription,
      isPrimary,
    });

    if (!result.success) {
      return Response.json(
        {
          ok: false,
          error: result.error,
          request_id: requestId,
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        ok: true,
        data: {
          assignmentId: result.assignmentId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/admin/franchises/forms]', error);

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          ok: false,
          error: 'Invalid request',
          details: error.errors,
          request_id: requestId,
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        ok: false,
        error: 'Failed to assign form',
        request_id: requestId,
      },
      { status: 500 }
    );
  }
}
