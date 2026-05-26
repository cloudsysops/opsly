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
        child_name: params.childNameHidden ? params.childNameDefault : trimmedChildName,
        rating: params.rating,
        satisfaction: params.rating,
        body: trimmedMessage,
        suggestion: trimmedMessage,
        parent_email: params.parentEmailHidden
          ? (params.parentEmail ?? params.parentEmailDefault)
          : trimmedEmail,
        author_ref_id: params.authorRefId,
        subject_ref_id: params.subjectRefId,
        visibility: params.visibility,
        audience: params.audience,
        contact_wanted: false,
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
