import { escapeHtml, sendHtmlEmail } from '../email';
import {
  findLeadEmailDeliveryByKey,
  insertPendingLeadEmailDelivery,
  updateLeadEmailDeliveryStatus,
} from './lead-confirmation-repository';
import { maskPeskidsDocument } from './pii-crypto';
import type { PeskidsLeadRow } from './repository';

const STAFF_NOTIFICATION_LEAD_TYPES = new Set(['teacher_applicant', 'company']);
const DEFAULT_STAFF_NOTIFICATION_EMAIL = 'peskidsnatacion@gmail.com';

export type StaffNotificationResult = {
  ok: boolean;
  status: 'skipped' | 'sent' | 'failed' | 'already_sent';
  detail: string;
  idempotency_key: string;
};

function staffNotificationIdempotencyKey(leadId: string): string {
  return `staff-lead-notification:${leadId}`;
}

function staffNotificationRecipient(): string {
  return process.env.PESKIDS_STAFF_NOTIFICATION_EMAIL?.trim() || DEFAULT_STAFF_NOTIFICATION_EMAIL;
}

function metadataString(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function buildTeacherApplicantHtml(row: PeskidsLeadRow): string {
  const experience = metadataString(row.metadata, 'experience');
  const availability = metadataString(row.metadata, 'availability');
  const workZones = metadataString(row.metadata, 'work_zones');
  const observations = metadataString(row.metadata, 'observations');

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#111">
      <h2>Nueva solicitud: Trabaja con nosotros</h2>
      <p><strong>Nombre:</strong> ${escapeHtml(row.full_name)}</p>
      <p><strong>Cédula:</strong> ${escapeHtml(maskPeskidsDocument(row.document_number))}</p>
      <p><strong>Correo:</strong> ${escapeHtml(row.email)}</p>
      <p><strong>Teléfono:</strong> ${escapeHtml(row.phone ?? 'No indicado')}</p>
      ${experience ? `<p><strong>Experiencia:</strong> ${escapeHtml(experience)}</p>` : ''}
      ${availability ? `<p><strong>Disponibilidad:</strong> ${escapeHtml(availability)}</p>` : ''}
      ${workZones ? `<p><strong>Zonas de trabajo:</strong> ${escapeHtml(workZones)}</p>` : ''}
      ${observations ? `<p><strong>Observaciones:</strong> ${escapeHtml(observations)}</p>` : ''}
      <p style="color:#666;font-size:12px">
        Hoja de vida y video (si se adjuntaron) quedan en metadata.attachments del lead en el panel admin.
      </p>
    </div>
  `.trim();
}

function buildCompanyHtml(row: PeskidsLeadRow): string {
  const contactRole = metadataString(row.metadata, 'contact_role');
  const location = metadataString(row.metadata, 'location');
  const need = metadataString(row.metadata, 'need');
  const approxChildren = row.metadata?.approx_children;

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#111">
      <h2>Nueva solicitud: Alianza institucional</h2>
      <p><strong>Institución:</strong> ${escapeHtml(row.company_name ?? 'No indicada')}</p>
      <p><strong>NIT:</strong> ${escapeHtml(maskPeskidsDocument(row.company_nit, 'No indicado'))}</p>
      <p><strong>Nombre de contacto:</strong> ${escapeHtml(row.full_name)}</p>
      ${contactRole ? `<p><strong>Cargo:</strong> ${escapeHtml(contactRole)}</p>` : ''}
      <p><strong>Correo:</strong> ${escapeHtml(row.email)}</p>
      <p><strong>Teléfono:</strong> ${escapeHtml(row.phone ?? 'No indicado')}</p>
      ${location ? `<p><strong>Ubicación:</strong> ${escapeHtml(location)}</p>` : ''}
      ${typeof approxChildren === 'number' ? `<p><strong>Aprox. niños:</strong> ${approxChildren}</p>` : ''}
      ${need ? `<p><strong>Necesidad:</strong> ${escapeHtml(need)}</p>` : ''}
    </div>
  `.trim();
}

function buildStaffNotificationHtml(row: PeskidsLeadRow): string {
  return row.lead_type === 'teacher_applicant'
    ? buildTeacherApplicantHtml(row)
    : buildCompanyHtml(row);
}

function buildStaffNotificationSubject(row: PeskidsLeadRow): string {
  return row.lead_type === 'teacher_applicant'
    ? `Nueva solicitud de profesor: ${row.full_name}`
    : `Nueva solicitud de alianza: ${row.company_name ?? row.full_name}`;
}

function logResult(result: StaffNotificationResult, leadId: string): void {
  console.info(
    JSON.stringify({
      component: 'peskids.staff_lead_notification_email',
      lead_id: leadId,
      idempotency_key: result.idempotency_key,
      status: result.status,
      ok: result.ok,
      detail: result.detail,
    })
  );
}

/** Returns a skip reason when this lead shouldn't get a staff notification, or null to proceed. */
function skipReason(row: PeskidsLeadRow): string | null {
  if (!STAFF_NOTIFICATION_LEAD_TYPES.has(row.lead_type)) {
    return `lead_type '${row.lead_type}' does not require staff notification`;
  }
  if (process.env.PESKIDS_STAFF_NOTIFICATION_ENABLED?.trim().toLowerCase() === 'false') {
    return 'PESKIDS_STAFF_NOTIFICATION_ENABLED=false';
  }
  return null;
}

/** Best-effort: mark the delivery row failed. Persistence errors here must never escalate. */
async function recordStaffNotificationFailure(
  idempotencyKey: string,
  detail: string
): Promise<void> {
  try {
    const existing = await findLeadEmailDeliveryByKey(idempotencyKey);
    if (existing) {
      await updateLeadEmailDeliveryStatus({
        id: existing.id,
        status: 'failed',
        error_detail: detail.slice(0, 500),
      });
    }
  } catch {
    // Persistence of failure must not escalate.
  }
}

/**
 * Notify Peskids staff by email when a teacher-applicant or company (alliance) lead comes in.
 * Never throws — fire-and-forget from lead POST. On by default; set
 * PESKIDS_STAFF_NOTIFICATION_ENABLED=false to disable.
 */
export async function dispatchPeskidsStaffLeadNotification(
  row: PeskidsLeadRow
): Promise<StaffNotificationResult> {
  const idempotencyKey = staffNotificationIdempotencyKey(row.id);

  const skip = skipReason(row);
  if (skip) {
    const skipped: StaffNotificationResult = {
      ok: true,
      status: 'skipped',
      detail: skip,
      idempotency_key: idempotencyKey,
    };
    logResult(skipped, row.id);
    return skipped;
  }

  const toEmail = staffNotificationRecipient();

  try {
    const existing = await findLeadEmailDeliveryByKey(idempotencyKey);
    if (existing?.status === 'sent') {
      const already: StaffNotificationResult = {
        ok: true,
        status: 'already_sent',
        detail: 'idempotent skip',
        idempotency_key: idempotencyKey,
      };
      logResult(already, row.id);
      return already;
    }

    const delivery =
      existing ??
      (await insertPendingLeadEmailDelivery({
        tenant_slug: row.tenant_slug,
        lead_id: row.id,
        idempotency_key: idempotencyKey,
        to_email: toEmail,
        email_type: 'staff_lead_notification',
      }));

    await sendHtmlEmail({
      to: toEmail,
      subject: buildStaffNotificationSubject(row),
      html: buildStaffNotificationHtml(row),
    });

    await updateLeadEmailDeliveryStatus({ id: delivery.id, status: 'sent' });

    const sent: StaffNotificationResult = {
      ok: true,
      status: 'sent',
      detail: 'staff notification email sent',
      idempotency_key: idempotencyKey,
    };
    logResult(sent, row.id);
    return sent;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    await recordStaffNotificationFailure(idempotencyKey, detail);
    const failed: StaffNotificationResult = {
      ok: false,
      status: 'failed',
      detail,
      idempotency_key: idempotencyKey,
    };
    logResult(failed, row.id);
    return failed;
  }
}
