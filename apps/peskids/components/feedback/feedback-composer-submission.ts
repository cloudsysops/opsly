import {
  parentFeedbackFormSchema,
  toFeedbackApiPayload,
} from '@/lib/validation/feedback.schema';
import { firstZodErrorMessage } from '@/lib/validation/zod-errors';

export type FeedbackAuthorType = 'parent' | 'teacher' | 'staff';
export type FeedbackSubjectType = 'general' | 'class' | 'student' | 'operations';
export type FeedbackVisibility = 'public' | 'private';
export type FeedbackAudience = 'family' | 'teacher' | 'admin';

interface SubmissionParams {
  childName: string;
  childNameHidden: boolean;
  childNameDefault: string;
  familyEmail: string;
  parentEmailHidden: boolean;
  parentEmail: string | null;
  parentEmailDefault: string;
  rating: number;
  message: string;
  authorType: FeedbackAuthorType;
  subjectType: FeedbackSubjectType;
  authorRefId: string | null;
  subjectRefId: string | null;
  visibility: FeedbackVisibility;
  audience: FeedbackAudience;
  contactMeBack?: boolean;
}

export interface SubmissionResult {
  ok: boolean;
  message?: string;
  error?: string;
}

export async function submitFeedback(params: SubmissionParams): Promise<SubmissionResult> {
  const trimmedChildName = params.childName.trim();
  const trimmedEmail = params.familyEmail.trim();
  const trimmedMessage = params.message.trim();
  const resolvedChildName = params.childNameHidden ? params.childNameDefault : trimmedChildName;
  const resolvedParentEmail = params.parentEmailHidden
    ? (params.parentEmail ?? params.parentEmailDefault)
    : trimmedEmail;

  if (params.authorType === 'parent') {
    const parsed = parentFeedbackFormSchema.safeParse({
      child_name: resolvedChildName,
      satisfaction: params.rating,
      suggestion: trimmedMessage || undefined,
      contact_me_back: params.contactMeBack ?? false,
      parent_email: resolvedParentEmail || undefined,
    });

    if (!parsed.success) {
      return { ok: false, error: firstZodErrorMessage(parsed.error) };
    }

    const apiFields = toFeedbackApiPayload(parsed.data);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          author_type: params.authorType,
          subject_type: params.subjectType,
          child_name: apiFields.child_name,
          rating: apiFields.satisfaction,
          satisfaction: apiFields.satisfaction,
          body: apiFields.suggestion ?? 'Calificación sin comentario adicional',
          suggestion: apiFields.suggestion ?? null,
          parent_email: apiFields.parent_email,
          author_ref_id: params.authorRefId,
          subject_ref_id: params.subjectRefId,
          visibility: params.visibility,
          audience: params.audience,
          contact_wanted: apiFields.contact_wanted,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo enviar el feedback.');
      }

      return {
        ok: true,
        message: payload.message || 'Feedback enviado correctamente.',
      };
    } catch (submissionError) {
      const messageText =
        submissionError instanceof Error ? submissionError.message : 'No se pudo enviar el feedback.';
      return { ok: false, error: messageText };
    }
  }

  if (!params.childNameHidden && !trimmedChildName) {
    return { ok: false, error: 'Escribe el nombre de la familia o del estudiante.' };
  }

  if (!params.parentEmailHidden && !trimmedEmail) {
    return { ok: false, error: 'Escribe el email de la familia para enviar este feedback.' };
  }

  if (!trimmedMessage) {
    return { ok: false, error: 'Escribe un comentario para poder enviarlo.' };
  }

  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        author_type: params.authorType,
        subject_type: params.subjectType,
        child_name: resolvedChildName,
        rating: params.rating,
        satisfaction: params.rating,
        body: trimmedMessage,
        suggestion: trimmedMessage,
        parent_email: resolvedParentEmail,
        author_ref_id: params.authorRefId,
        subject_ref_id: params.subjectRefId,
        visibility: params.visibility,
        audience: params.audience,
        contact_wanted: params.contactMeBack ?? false,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    if (!response.ok) {
      throw new Error(payload.error || 'No se pudo enviar el feedback.');
    }

    return {
      ok: true,
      message: payload.message || 'Feedback enviado correctamente.',
    };
  } catch (submissionError) {
    const messageText =
      submissionError instanceof Error ? submissionError.message : 'No se pudo enviar el feedback.';
    return { ok: false, error: messageText };
  }
}
