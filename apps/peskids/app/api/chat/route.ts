import { NextRequest } from 'next/server';
import { validateChatUserMessage } from '@intcloudsysops/prompt-guard';
import { triggerN8nMessagePipeline } from '@/lib/chat-assistant';
import { storeDraftReply, storeInboundMessage, storeOutboundMessage } from '@/lib/message-store';
import { emitEvent } from '@/lib/events';
import { buildPeskidsIntakeTurn } from '@/lib/peskids-intake';
import { submitLeadFromIntake } from '@/lib/peskids-lead-from-intake';
import { buildWhatsAppUrl } from '@/lib/contact-channels';
import { buildPostLeadWhatsAppPrefill } from '@/lib/peskids-lead-session';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

function buildHandoffWhatsApp(params: {
  mode: 'admissions' | 'support';
  parentName?: string;
  classModality?: 'llanogrande' | 'domicilio' | null;
  leadType?: 'family' | 'teacher_applicant' | 'company' | null;
  leadId?: string | null;
  email?: string | null;
  phone?: string | null;
  childName?: string | null;
  neighborhood?: string | null;
  gradeInterested?: string | null;
  companyName?: string | null;
}): { url: string; label: string } | null {
  if (params.mode !== 'admissions') return null;
  const leadType = params.leadType ?? 'family';
  const modality =
    leadType === 'family' ? (params.classModality ?? null) : 'llanogrande';
  const name = params.parentName?.trim() || 'familia';
  const url = buildWhatsAppUrl({
    modality,
    prefill: buildPostLeadWhatsAppPrefill(name, {
      class_modality: modality,
      lead_type: leadType,
      lead_id: params.leadId,
      email: params.email,
      phone: params.phone,
      child_name: params.childName,
      neighborhood: params.neighborhood,
      grade_interested: params.gradeInterested,
      company_name: params.companyName,
    }),
  });
  const label =
    leadType === 'teacher_applicant'
      ? 'Continuar por WhatsApp (profesores)'
      : leadType === 'company'
        ? 'Continuar por WhatsApp (empresas)'
        : modality === 'domicilio'
          ? 'Continuar por WhatsApp Domicilios'
          : modality === 'llanogrande'
            ? 'Continuar por WhatsApp Llanogrande'
            : 'Continuar por WhatsApp con un asesor';
  return { url, label };
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);

  try {
    const body = (await req.json()) as {
      message?: string;
      session_id?: string;
      sender_name?: string;
      mode?: 'admissions' | 'support';
    };

    const sessionId = body.session_id?.trim() ?? 'web-anonymous';
    const mode = body.mode ?? 'admissions';

    const validated = validateChatUserMessage(body.message ?? '');
    if (!validated.ok) {
      if (validated.safeResponse) {
        return successJson(requestId, {
          ok: true,
          message_id: null,
          draft_id: null,
          reply: validated.safeResponse,
          stage: 'blocked',
          progress: 0,
          profile: null,
          support_draft: null,
          input_mode: 'text',
          quick_replies: [],
          from_llm: false,
          lead_saved: false,
          whatsapp: null,
          disclaimer: 'Mensaje revisado por políticas de seguridad.',
        });
      }
      return errorJson(requestId, validated.error, validated.status);
    }
    const messageText = validated.message;

    const { message, error: storeError } = await storeInboundMessage({
      source: 'web',
      sender_contact: `web:${sessionId}`,
      sender_name: body.sender_name?.trim() || 'Visitante web',
      message_text: messageText,
      external_id: `web-${sessionId}-${Date.now()}`,
    });

    if (storeError || !message) {
      return errorJson(requestId, 'Failed to store message', 500);
    }

    const intake = await buildPeskidsIntakeTurn({
      senderContact: message.sender_contact,
      senderName: body.sender_name,
      source: 'web',
      latestMessage: messageText,
      mode,
    });

    let leadSaved = false;
    let leadId: string | null = null;
    if (mode === 'admissions' && intake.stage === 'handoff') {
      const leadResult = await submitLeadFromIntake(intake.profile);
      leadSaved = leadResult.ok;
      leadId = leadResult.leadId ?? null;
      if (!leadSaved) {
        console.error('Chat admissions lead persist failed', {
          request_id: requestId,
          profile_keys: Object.keys(intake.profile),
        });
      }
    }

    await storeOutboundMessage({
      parentId: message.id,
      source: 'web',
      sender_contact: message.sender_contact,
      replyText: intake.reply,
      aiGenerated: true,
      senderName: 'Asistente Peskids',
      status: 'sent',
    });

    const draft = intake.supportDraft
      ? await storeDraftReply(message.id, intake.supportDraft, 'web', {
          senderName: 'Asistente Peskids',
          status: 'pending',
        })
      : { draft: null };

    void triggerN8nMessagePipeline(message.id, messageText);

    await emitEvent('message.received', {
      source: 'web',
      sender_contact: message.sender_contact,
      message_text: messageText,
      intake_stage: intake.stage,
      intake_progress: intake.progress,
      intake_missing_field: intake.missingField,
      lead_saved: leadSaved,
      timestamp: new Date().toISOString(),
    });

    const whatsapp =
      intake.stage === 'handoff'
        ? buildHandoffWhatsApp({
            mode,
            parentName: intake.profile.parentName,
            classModality: intake.profile.classModality ?? null,
            leadType: intake.profile.applicantRole ?? 'family',
            leadId,
            email: intake.profile.email,
            phone: intake.profile.phone,
            childName: intake.profile.childName,
            neighborhood: intake.profile.neighborhood,
            gradeInterested: intake.profile.gradeInterested,
            companyName: intake.profile.companyName,
          })
        : null;

    const admissionsDisclaimer =
      intake.stage === 'handoff'
        ? leadSaved
          ? 'Tus datos ya quedaron en la plataforma Peskids. Un asesor humano te continúa por WhatsApp con el equipo correcto.'
          : 'Completamos el chat; el equipo revisará tu caso. Si el registro automático falló, el asesor te pedirá confirmar datos.'
        : 'Responde tocando las opciones del chat. Al final guardamos tu solicitud y te conectaremos a WhatsApp humano.';

    const supportDisclaimer =
      intake.stage === 'handoff'
        ? 'Tu caso quedó listo para el equipo de soporte. Si requiere reprogramación o cancelación, primero lo valida una persona del equipo.'
        : 'Te haré algunas preguntas cortas para orientar tu caso de soporte.';

    return successJson(requestId, {
      ok: true,
      message_id: message.id,
      draft_id: draft.draft?.id ?? null,
      reply: intake.reply,
      stage: intake.stage,
      progress: intake.progress,
      profile: intake.profile,
      support_draft: intake.supportDraft,
      input_mode: intake.inputMode,
      quick_replies: intake.quickReplies,
      from_llm: false,
      lead_saved: leadSaved,
      whatsapp,
      disclaimer: mode === 'support' ? supportDisclaimer : admissionsDisclaimer,
    });
  } catch (error) {
    console.error('Chat API error:', error, { request_id: requestId });
    return errorJson(requestId, 'Internal server error', 500);
  }
}
