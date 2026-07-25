import { z } from 'zod';
import { submitFormResponse } from '@/lib/services/franchise-forms.service';

const submitFormSchema = z.object({
  deliveryId: z.string().uuid(),
  templateId: z.string().uuid(),
  responseData: z.record(z.unknown()),
});

/**
 * POST /api/public/forms/submit
 * Public endpoint for families to submit form responses
 * No authentication required - validates via delivery link
 */
export async function POST(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const body = await req.json();
    const { deliveryId, templateId, responseData } = submitFormSchema.parse(body);

    // Get client IP for logging
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');

    const result = await submitFormResponse({
      deliveryId,
      templateId,
      responseData,
      ipAddress: ipAddress || undefined,
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
          responseId: result.responseId,
          message: 'Form submitted successfully',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/public/forms/submit]', error);

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
        error: 'Failed to submit form',
        request_id: requestId,
      },
      { status: 500 }
    );
  }
}
