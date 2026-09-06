/**
 * Public landing copy — parent-facing, no internal/demo language.
 *
 * Free/trial classes (“clase de prueba” / D2) are permanently discontinued.
 * Do NOT restore trial-class wording without an explicit product decision and
 * a new DB migration / pricing update. Contact/matrícula language is permanent.
 */

export const PESKIDS_RESERVATION_EYEBROW = 'Cupos abiertos.';

export const PESKIDS_RESERVATION_TITLE = 'Aprenden. Se divierten. Somos Peskids.';

export const PESKIDS_RESERVATION_DESCRIPTION =
  'Academia de natación especializada en bebés y niños. Clases en nuestra sede Llanogrande o a domicilio en Medellín y el área metropolitana.';

/** Who the form is for — below the title, distinct from hero handoff copy. */
export const PESKIDS_RESERVATION_AUDIENCE =
  'Este formulario es para familias que quieren inscribir a sus hijos en nuestras clases, profesores interesados en unirse a nuestro equipo, o empresas interesadas en crear alianzas con Peskids.';

/** @deprecated Prefer PESKIDS_RESERVATION_AUDIENCE — kept for older imports/tests. */
export const PESKIDS_RESERVATION_BULLETS = [
  PESKIDS_RESERVATION_AUDIENCE,
] as const;

export const PESKIDS_FORM_CARD_TITLE = 'Formulario de solicitud';

export const PESKIDS_FORM_CARD_DESCRIPTION =
  'Solo te tomará 1 minuto. Al finalizar te direccionamos a la línea de atención correspondiente.';

export const PESKIDS_FORM_QUESTIONS_CONTEXT =
  'Responde estas preguntas para guardar tus datos y direccionarte a la línea de atención correspondiente.';

/** Primary CTA — submits form. */
export const PESKIDS_FORM_SUBMIT_LABEL = 'Enviar solicitud';

/** Post-form handoff only — not shown before lead capture. */
export const PESKIDS_WHATSAPP_CTA_LABEL = 'Continuar por WhatsApp';

export const PESKIDS_FORM_SUCCESS_TITLE = '¡Gracias, recibimos tu solicitud!';

export const PESKIDS_FORM_SUCCESS_DETAIL =
  'Copia el mensaje o envíalo por WhatsApp al equipo de soporte.';

export const PESKIDS_FORM_SUCCESS_LLANOGRANDE =
  'Copia el mensaje o envíalo por WhatsApp a la línea de la sede Llanogrande.';

export const PESKIDS_FORM_SUCCESS_DOMICILIO =
  'Copia el mensaje o envíalo por WhatsApp a la línea de Domicilios.';

export const PESKIDS_FORM_SUCCESS_NEXT =
  'Envía este mensaje por WhatsApp al equipo de soporte para ser atendido. El equipo validará tu solicitud.';

export const PESKIDS_FORM_SUCCESS_RESPONSE_TIME = 'Tiempo promedio de respuesta: 5–10 minutos';

export const PESKIDS_CTA_BAND_TITLE = '¿Listo para conocer Peskids?';

export const PESKIDS_CTA_BAND_DESCRIPTION =
  'Responde las preguntas del formulario para direccionarte a la línea de atención correspondiente.';

export const PESKIDS_CTA_BAND_BUTTON = 'Abrir formulario';

/** Instagram entry — same offer, channel-specific intro only. */
export const PESKIDS_INSTAGRAM_LANDING_INTRO =
  'Desde Instagram: responde estas preguntas y te direccionamos con el asesor de tu sede.';

export const PESKIDS_CONSENT_TREATMENT =
  'Autorizo a Peskids para tratar mis datos personales y, cuando aplique, los del menor bajo mi responsabilidad, con el fin de atender esta solicitud de información y contacto, conforme a su Política de Privacidad.';

export const PESKIDS_CONSENT_MARKETING =
  'Acepto recibir información sobre programas, novedades y promociones de Peskids por WhatsApp o correo electrónico. Puedo cancelar esta autorización en cualquier momento.';

export const PESKIDS_CONSENT_PHOTOS_VIDEOS =
  'Autorizo a Peskids para usar fotos y videos de mis clases en sus redes sociales (Instagram, Facebook, TikTok) con fines promocionales. Entiendo que estas imágenes serán de carácter educativo y profesional.';

/** Only shown/required when the form actually collects a document_number (family, teacher_applicant). */
export const PESKIDS_CONSENT_IDENTITY_DOCUMENT =
  'Autorizo a Peskids a solicitar y almacenar mi número de documento de identidad (o el del acudiente, cuando aplique) con el fin de verificar la identidad y preparar el contrato de matrícula. Este dato se conserva según nuestra Política de Retención de Datos y solo tiene acceso el personal autorizado de la sede.';

/** @deprecated Prefer PESKIDS_RESERVATION_FORM_ANCHOR — kept for older anchors. */
export const PESKIDS_CHAT_SECTION_ANCHOR = 'reserva';
