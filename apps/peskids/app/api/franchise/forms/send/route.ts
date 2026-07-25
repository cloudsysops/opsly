import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateFamilyRequest } from '@/lib/family-auth';
import { sendFormToFamily } from '@/lib/services/franchise-forms.service';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

const sendFormSchema = z.object({
  formAssignmentId: z.string().uuid(),
  templateId: z.string().uuid(),
  recipients: z.array(
    z.object({
      email: z.string().email(),
      name: z.string().min(1),
      phone: z.string().optional(),
    })
  ),
  deliveryMethod: z.enum(['email', 'sms', 'whatsapp']),
  expiresInDays: z.number().int().min(1).max(90).optional(),
});

/**
 * POST /api/franchise/forms/send
 * Franchise endpoint to send forms to families
 * Requires franchise admin authentication
 */
export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);

  try {
    const auth = await validateFamilyRequest(req);
    if (!auth.ok) {
      return errorJson(requestId, auth.error, auth.status);
    }

    // For now, use family ID as franchise tenant ID
    // In production, this would come from the franchise auth context
    const franchiseTenantId = auth.user.id;

    const body = await req.json();
    const { formAssignmentId, templateId, recipients, deliveryMethod, expiresInDays } =
      sendFormSchema.parse(body);

    // Send to all recipients
    const results = await Promise.all(
      recipients.map((recipient) =>
        sendFormToFamily({
          franchiseTenantId,
          formAssignmentId,
          templateId,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          recipientPhone: recipient.phone,
          deliveryMethod,
          expiresInDays,
        })
      )
    );

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return successJson(requestId, {
      sentCount: successCount,
      failureCount,
      results: results.map((r) => ({
        success: r.success,
        deliveryId: r.deliveryId,
        error: r.error,
      })),
    });
  } catch (error) {
    console.error('[POST /api/franchise/forms/send]', error);

    if (error instanceof z.ZodError) {
      return errorJson(requestId, 'Invalid request', 400);
    }

    return errorJson(requestId, 'Failed to send forms', 500);
  }
}
