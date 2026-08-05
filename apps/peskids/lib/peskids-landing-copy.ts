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

export const PESKIDS_RESERVATION_BULLETS = [
  'Eres familia, profesor o empresa — responde el chat',
  'Elegimos Llanogrande o domicilio según tus necesidades',
  'Continúa por WhatsApp con tu equipo de atención',
] as const;

export const PESKIDS_FORM_CARD_TITLE = 'Cuéntanos sobre tu familia';

export const PESKIDS_FORM_CARD_DESCRIPTION =
  'Estas preguntas nos ayudan a recomendar la mejor sede, modalidad y profesor para tu familia.';

/** Primary CTA — opens / scrolls to admissions chat. */
export const PESKIDS_FORM_SUBMIT_LABEL = 'Abrir chat de información';

/** Post-form handoff only — not shown before lead capture. */
export const PESKIDS_WHATSAPP_CTA_LABEL = 'Continuar por WhatsApp';

export const PESKIDS_FORM_SUCCESS_TITLE = '¡Gracias, recibimos tu solicitud!';

export const PESKIDS_FORM_SUCCESS_DETAIL =
  'Tu solicitud fue registrada para {modality}.\nContinúa por WhatsApp con el equipo de atención correspondiente.';

export const PESKIDS_FORM_SUCCESS_RESPONSE_TIME = '¿Qué sigue?\nAbre WhatsApp para continuar con atención personalizada.';

export const PESKIDS_CONSENT_TREATMENT =
  'Autorizo a Peskids para tratar mis datos personales y, cuando aplique, los del menor bajo mi responsabilidad, con el fin de atender esta solicitud de contacto y matrícula, conforme a su Política de Privacidad.';

export const PESKIDS_CONSENT_MARKETING =
  'Acepto recibir información sobre programas, novedades y promociones de Peskids por WhatsApp o correo electrónico. Puedo cancelar esta autorización en cualquier momento.';

export const PESKIDS_CONSENT_PHOTOS_VIDEOS =
  'Autorizo a Peskids para usar fotos y videos de mis clases en sus redes sociales (Instagram, Facebook, TikTok) con fines promocionales. Entiendo que estas imágenes serán de carácter educativo y profesional.';

/** Instagram entry — same offer, channel-specific intro only. */
export const PESKIDS_INSTAGRAM_LANDING_INTRO =
  'Desde Instagram: responde el chat para guardar tus datos y te direccionamos a la línea de atención correspondiente.';

/** Anchor id for the interactive admissions chat on public landings. */
export const PESKIDS_CHAT_SECTION_ANCHOR = 'contacto';
