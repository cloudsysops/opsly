import { sendForm, listFormTemplates } from '@/lib/services/form.service';
import { adminAuth } from '@intcloudsysops/security';
import { z } from 'zod';

const sendFormSchema = z.object({
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

export async function POST(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    await adminAuth(req);

    const body = await req.json();
    const { templateId, recipients, deliveryMethod, expiresInDays } = sendFormSchema.parse(body);

    // Verify template exists
    const templates = await listFormTemplates();
    const template = templates.find((t) => t.id === templateId);

    if (!template) {
      return Response.json(
        {
          ok: false,
          error: 'Form template not found',
          request_id: requestId,
        },
        { status: 404 }
      );
    }

    // Send forms to all recipients
    const deliveries = await Promise.all(
      recipients.map((recipient) =>
        sendForm({
          templateId,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          recipientPhone: recipient.phone,
          deliveryMethod,
          expiresInDays,
        })
      )
    );

    // TODO: Integrate with email/SMS service to actually send
    // For now, just creating delivery records
    console.error(`Created ${deliveries.length} form deliveries for sending`);

    return Response.json(
      {
        ok: true,
        data: {
          sentCount: deliveries.length,
          deliveries: deliveries.map((d) => ({
            id: d.id,
            recipient: d.recipient_email,
            status: d.delivery_status,
            expiresAt: d.expires_at,
          })),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Form sending failed:', error);

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
        error: 'Failed to send forms',
        request_id: requestId,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    await adminAuth(req);

    const templates = await listFormTemplates();

    return Response.json(
      {
        ok: true,
        data: {
          templates: templates.map((t) => ({
            id: t.id,
            name: t.name,
            type: t.form_type,
            fieldCount: (t.fields as unknown[]).length,
          })),
        },
      },
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    console.error('Failed to list form templates:', error);
    return Response.json(
      { ok: false, error: 'Failed to list templates', request_id: requestId },
      { status: 500 }
    );
  }
}
