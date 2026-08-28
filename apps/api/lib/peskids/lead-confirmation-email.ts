import { escapeHtml, sendHtmlEmail } from '../email';
import { isPeskidsLeadConfirmationEnabled } from './feature-flags';
import {
  findLeadEmailDeliveryByKey,
  insertPendingLeadEmailDelivery,
  updateLeadEmailDeliveryStatus,
} from './lead-confirmation-repository';
import type { PeskidsLeadRow } from './repository';

export type LeadConfirmationResult = {
  ok: boolean;
  status: 'skipped' | 'sent' | 'failed' | 'already_sent';
  detail: string;
  idempotency_key: string;
};

function confirmationIdempotencyKey(leadId: string): string {
  return `lead-confirmation:${leadId}`;
}

function confirmationFromAddress(): string | undefined {
  const dedicated = process.env.PESKIDS_EMAIL_FROM?.trim();
  if (dedicated && dedicated.length > 0) {
    return dedicated;
  }
  return undefined;
}

function buildConfirmationHtml(row: PeskidsLeadRow): string {
  const name = escapeHtml(row.full_name);
  const modality = row.class_modality ? escapeHtml(row.class_modality) : null;
  const grade = escapeHtml(row.grade_interested);
  const whatsappE164 =
    process.env.NEXT_PUBLIC_PESKIDS_WHATSAPP_E164?.trim() ||
    process.env.PESKIDS_WHATSAPP_E164?.trim() ||
    '';
  const waLink =
    whatsappE164.length > 0 ? `https://wa.me/${whatsappE164.replace(/[^\d]/g, '')}` : null;

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111">
      <p>Hola ${name},</p>
      <p>Recibimos tu interés en Peskids${
        modality ? ` (${modality})` : ''
      } para el grado <strong>${grade}</strong>.</p>
      <p>Nuestro equipo te contactará pronto por WhatsApp o teléfono para agendar una clase de prueba.</p>
      ${
        waLink ? `<p>Si quieres escribirnos ahora: <a href="${waLink}">abrir WhatsApp</a>.</p>` : ''
      }
      <p style="color:#666;font-size:12px">Este mensaje es automático. No compartas datos sensibles por email.</p>
    </div>
  `.trim();
}

function logResult(result: LeadConfirmationResult, leadId: string): void {
  console.info(
    JSON.stringify({
      component: 'peskids.lead_confirmation_email',
      lead_id: leadId,
      idempotency_key: result.idempotency_key,
      status: result.status,
      ok: result.ok,
      detail: result.detail,
    })
  );
}

/**
 * Send parent confirmation email via Resend. Never throws — fire-and-forget from lead POST.
 * Gated by PESKIDS_LEAD_CONFIRMATION_ENABLED (default false).
 */
export async function dispatchPeskidsLeadConfirmationEmail(
  row: PeskidsLeadRow
): Promise<LeadConfirmationResult> {
  const idempotencyKey = confirmationIdempotencyKey(row.id);

  if (!isPeskidsLeadConfirmationEnabled()) {
    const skipped: LeadConfirmationResult = {
      ok: true,
      status: 'skipped',
      detail: 'PESKIDS_LEAD_CONFIRMATION_ENABLED=false',
      idempotency_key: idempotencyKey,
    };
    logResult(skipped, row.id);
    return skipped;
  }

  if (!row.email || row.email.trim().length === 0) {
    const failed: LeadConfirmationResult = {
      ok: false,
      status: 'failed',
      detail: 'lead has no email',
      idempotency_key: idempotencyKey,
    };
    logResult(failed, row.id);
    return failed;
  }

  try {
    const existing = await findLeadEmailDeliveryByKey(idempotencyKey);
    if (existing?.status === 'sent') {
      const already: LeadConfirmationResult = {
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
        to_email: row.email,
      }));

    await sendHtmlEmail({
      to: row.email,
      subject: 'Recibimos tu interés en Peskids',
      html: buildConfirmationHtml(row),
      from: confirmationFromAddress(),
    });

    await updateLeadEmailDeliveryStatus({
      id: delivery.id,
      status: 'sent',
    });

    const sent: LeadConfirmationResult = {
      ok: true,
      status: 'sent',
      detail: 'confirmation email sent',
      idempotency_key: idempotencyKey,
    };
    logResult(sent, row.id);
    return sent;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
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
    const failed: LeadConfirmationResult = {
      ok: false,
      status: 'failed',
      detail,
      idempotency_key: idempotencyKey,
    };
    logResult(failed, row.id);
    return failed;
  }
}
