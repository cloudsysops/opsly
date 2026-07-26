import { submitFormResponse, getFormDelivery, getFormTemplate } from '@/lib/services/form.service';
import { z } from 'zod';
import { apiRateLimiter } from '@/lib/middleware/rate-limit';

export async function POST(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const limit = apiRateLimiter(req);
    if (!limit.allowed) {
      return Response.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

    const body = await req.json();
    const { deliveryId, templateId, responseData } = z
      .object({
        deliveryId: z.string().uuid(),
        templateId: z.string().uuid(),
        responseData: z.record(z.unknown()),
      })
      .parse(body);

    // Validate delivery exists and not expired
    const delivery = await getFormDelivery(deliveryId);
    if (!delivery) {
      return Response.json(
        { ok: false, error: 'Form not found', request_id: requestId },
        { status: 404 }
      );
    }

    if (delivery.expires_at && new Date(delivery.expires_at) < new Date()) {
      return Response.json(
        { ok: false, error: 'Form has expired', request_id: requestId },
        { status: 410 }
      );
    }

    // Validate template
    const template = await getFormTemplate(templateId);
    if (!template) {
      return Response.json(
        { ok: false, error: 'Invalid form template', request_id: requestId },
        { status: 400 }
      );
    }

    // Submit response
    const response = await submitFormResponse({
      deliveryId,
      templateId,
      responseData,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
    });

    return Response.json(
      {
        ok: true,
        data: {
          responseId: response.id,
          message: 'Gracias por completar el formulario. Nos pondremos en contacto pronto.',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Form submission failed:', error);

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          ok: false,
          error: 'Invalid form data',
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
