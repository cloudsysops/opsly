import { listPendingCRMSync } from '@/lib/services/form.service';
import { adminAuth } from '@intcloudsysops/security';

export async function GET(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    await adminAuth(req);

    const searchParams = new URL(req.url).searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const responses = await listPendingCRMSync(limit);

    return Response.json(
      {
        ok: true,
        data: {
          pendingSyncCount: responses.length,
          responses: responses.map((r) => ({
            id: r.id,
            familyName: r.delivery.recipient_name,
            email: r.delivery.recipient_email,
            phone: r.delivery.recipient_phone,
            formType: r.template.form_type,
            submittedAt: r.submitted_at,
            data: r.response_data,
            crmStatus: r.crm_sync_status,
          })),
        },
      },
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    console.error('Failed to fetch form responses:', error);
    return Response.json(
      { ok: false, error: 'Failed to fetch responses', request_id: requestId },
      { status: 500 }
    );
  }
}
