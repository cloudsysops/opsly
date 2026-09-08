export type SupportReplyTemplate = {
  id: string;
  label: string;
  message: string;
};

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export function buildFamilySupportTemplates(
  name: string,
  status: string
): SupportReplyTemplate[] {
  const templates: SupportReplyTemplate[] = [
    {
      id: 'enrollment_link',
      label: 'Enviar link de matrícula',
      message: `Hola ${name}! 🏊 Gracias por escribirnos a Peskids. Te compartimos el formulario de matrícula para completar los datos de la familia y el estudiante. Cualquier duda nos escribes por aquí.`,
    },
  ];

  if (status === 'enrolled' || status === 'active') {
    templates.push({
      id: 'welcome_enrolled',
      label: 'Bienvenida — matriculado',
      message: `¡Bienvenido a Peskids, ${name}! 🎉 Tu matrícula quedó confirmada. En breve te compartimos los detalles de pago y el horario definitivo de las clases.`,
    });
  }

  templates.push({
    id: 'missing_info',
    label: 'Solicitar información faltante',
    message: `Hola ${name}, para continuar con tu solicitud en Peskids nos falta un dato. ¿Nos puedes confirmar esa información por aquí para seguir con el proceso?`,
  });

  templates.push({
    id: 'follow_up',
    label: 'Seguimiento — ¿sigue interesado?',
    message: `Hola ${name}, ¿sigues interesado/a en las clases de natación con Peskids? Cuéntanos si quieres que te enviemos el formulario de matrícula.`,
  });

  return templates;
}

function teacherApplicantTemplates(name: string): SupportReplyTemplate[] {
  return [
    {
      id: 'application_received',
      label: 'Confirmar recepción de aplicación',
      message: `Hola ${name}, recibimos tu hoja de vida y tu video de natación. Nuestro equipo lo va a revisar y te contactamos pronto con los siguientes pasos. ¡Gracias por tu interés en Peskids!`,
    },
    {
      id: 'application_approved',
      label: 'Aprobado — siguientes pasos',
      message: `¡Hola ${name}! Tu aplicación como profesor(a) en Peskids fue aprobada 🎉 Te vamos a compartir los siguientes pasos para la vinculación. ¿Tienes disponibilidad para una llamada breve esta semana?`,
    },
    {
      id: 'no_vacancy',
      label: 'Sin vacantes por ahora',
      message: `Hola ${name}, gracias por tu interés en Peskids. Por ahora no tenemos vacantes disponibles para tu perfil, pero guardamos tu información y te contactamos apenas surja una oportunidad.`,
    },
  ];
}

function companyTemplates(name: string): SupportReplyTemplate[] {
  return [
    {
      id: 'schedule_call',
      label: 'Agendar llamada',
      message: `Hola ${name}, gracias por tu interés en una alianza con Peskids. ¿Podemos agendar una llamada esta semana para conversar los detalles? Cuéntanos qué día y hora te queda bien.`,
    },
    {
      id: 'proposal_follow_up',
      label: 'Seguimiento de propuesta',
      message: `Hola ${name}, ¿pudiste revisar la propuesta que te compartimos para la alianza con Peskids? Quedamos atentos a tus comentarios o dudas.`,
    },
  ];
}

export function buildSupportReplyTemplates(input: {
  leadName: string;
  leadType: string | null | undefined;
  status: string;
}): SupportReplyTemplate[] {
  const name = firstName(input.leadName);
  if (input.leadType === 'teacher_applicant') return teacherApplicantTemplates(name);
  if (input.leadType === 'company') return companyTemplates(name);
  return buildFamilySupportTemplates(name, input.status);
}
