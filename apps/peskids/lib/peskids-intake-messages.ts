import type { MessageSource } from '@/lib/message-store'
import { classModalityLabel } from '@/lib/lead-modality'
import { formatAgeRange } from '@/lib/peskids-domain'

export type PeskidsIntakeStage = 'collecting' | 'handoff'
export type PeskidsIntakeInputMode = 'text' | 'choice'
export type PeskidsChatMode = 'admissions' | 'support'

export type PeskidsIntakeChoice = {
  label: string
  value: string
}

type PeskidsClassModality = 'llanogrande' | 'domicilio'

export type PeskidsIntakeProfile = {
  parentName?: string
  email?: string
  phone?: string
  specialCondition?: 'yes' | 'no'
  specialConditionDetails?: string
  teacherPreference?: 'none' | 'woman' | 'man' | 'prefer_not_to_say'
  classModality?: PeskidsClassModality
  neighborhood?: string
  /** Valores del formulario web: K-5 | 6-8 | 9-12 | Other */
  gradeInterested?: string
  referralSource?: string
  childName?: string
  childAge?: string
  issueType?:
    | 'class'
    | 'schedule'
    | 'reschedule'
    | 'cancel'
    | 'payment'
    | 'attendance'
    | 'feedback'
    | 'access'
    | 'other'
  issueDetails?: string
  urgency?: 'today' | 'this_week' | 'when_possible'
  preferredContact?: 'chat' | 'whatsapp' | 'phone' | 'email'
}

export type PeskidsIntakeQuestionSpec = {
  prompt: string
  inputMode: PeskidsIntakeInputMode
  choices: PeskidsIntakeChoice[] | null
}

/** Mensaje inicial del chatbox (web / WhatsApp automático). */
export function peskidsIntakeWelcome(source: MessageSource): string {
  const channel =
    source === 'whatsapp'
      ? 'Por este chat de WhatsApp'
      : 'Por este chat en la web de Peskids'
  return (
    `¡Hola! Somos Peskids 🐠 Academia de natación en Llanogrande (Rionegro), área metropolitana de Medellín. ` +
    `Clases para niños desde 3 meses hasta 15 años, en sede o a domicilio. La primera clase de prueba es gratis.\n\n` +
    `${channel} te haré unas preguntas cortas (igual que el formulario de reserva). ` +
    `Cuando terminemos, un asesor humano revisará tu caso y te confirmará horario en menos de 48 h hábiles.`
  )
}

export function peskidsSupportWelcome(source: MessageSource): string {
  const channel =
    source === 'whatsapp'
      ? 'Por este chat de WhatsApp'
      : 'Desde el portal de familias'
  return (
    `¡Hola! Somos el equipo de soporte de Peskids 🐠\n\n` +
    `${channel} te haré unas preguntas cortas para resolver tu caso más rápido. ` +
    `Primero, ¿cómo te llamas (nombre del acudiente)?`
  )
}

const GRADE_LABELS: Record<string, string> = {
  'K-5': '3 meses–5 años',
  '6-8': '6–8 años',
  '9-12': '9–12 años',
  Other: 'Otro / consulta general',
}

export function questionSpecForField(
  field: keyof PeskidsIntakeProfile | string,
  profile: PeskidsIntakeProfile,
  mode: PeskidsChatMode = 'admissions'
): PeskidsIntakeQuestionSpec {
  if (mode === 'support') {
    switch (field) {
      case 'parentName':
        return {
          prompt: 'Para empezar, ¿cómo te llamas (nombre del acudiente)?',
          inputMode: 'text',
          choices: null,
        }
      case 'childName':
        return {
          prompt: '¿Cómo se llama el estudiante?',
          inputMode: 'text',
          choices: null,
        }
      case 'issueType':
        return {
          prompt: '¿Qué necesitas resolver?',
          inputMode: 'choice',
          choices: [
            { label: 'Clase', value: 'class' },
            { label: 'Horario', value: 'schedule' },
            { label: 'Reprogramar clase', value: 'reschedule' },
            { label: 'Cancelar clase', value: 'cancel' },
            { label: 'Pago', value: 'payment' },
            { label: 'Asistencia', value: 'attendance' },
            { label: 'Feedback', value: 'feedback' },
            { label: 'Acceso', value: 'access' },
            { label: 'Otro', value: 'other' },
          ],
        }
      case 'issueDetails':
        return {
          prompt: 'Cuéntanos brevemente qué pasó o qué necesitas que revisemos.',
          inputMode: 'text',
          choices: null,
        }
      case 'urgency':
        return {
          prompt: '¿Qué tan urgente es?',
          inputMode: 'choice',
          choices: [
            { label: 'Hoy', value: 'today' },
            { label: 'Esta semana', value: 'this_week' },
            { label: 'Cuando puedan', value: 'when_possible' },
          ],
        }
      case 'preferredContact':
        return {
          prompt: '¿Cómo prefieres que te respondamos?',
          inputMode: 'choice',
          choices: [
            { label: 'Aquí mismo', value: 'chat' },
            { label: 'WhatsApp', value: 'whatsapp' },
            { label: 'Llamada', value: 'phone' },
            { label: 'Correo', value: 'email' },
          ],
        }
      case 'phone':
        return {
          prompt: '¿Cuál número de WhatsApp o celular prefieres para que te contactemos?',
          inputMode: 'text',
          choices: null,
        }
      case 'email':
        return {
          prompt: `Gracias${profile.parentName ? `, ${profile.parentName}` : ''}. ¿Cuál es tu correo electrónico?`,
          inputMode: 'text',
          choices: null,
        }
      default:
        return {
          prompt: '¿Me compartes un poco más de información para completar tu solicitud?',
          inputMode: 'text',
          choices: null,
        }
    }
  }

  switch (field) {
    case 'parentName':
      return {
        prompt: 'Para empezar, ¿cómo te llamas (nombre del acudiente)?',
        inputMode: 'text',
        choices: null,
      }
    case 'email':
      return {
        prompt: `Gracias${profile.parentName ? `, ${profile.parentName}` : ''}. ¿Cuál es tu correo electrónico? Lo usamos para confirmar la clase de prueba.`,
        inputMode: 'text',
        choices: null,
      }
    case 'referralSource':
      return {
        prompt: '¿Por dónde nos escuchaste?',
        inputMode: 'choice',
        choices: [
          { label: 'Referido', value: 'Referido' },
          { label: 'Instagram', value: 'Instagram' },
          { label: 'Página web', value: 'Página web' },
          { label: 'WhatsApp', value: 'WhatsApp' },
          { label: 'Google / buscador', value: 'Google / buscador' },
          { label: 'Google Maps', value: 'Google Maps' },
          { label: 'Facebook', value: 'Facebook' },
          { label: 'Otro', value: 'Otro' },
        ],
      }
    case 'specialCondition':
      return {
        prompt: '¿Tiene alguna condición a tener en cuenta?',
        inputMode: 'choice',
        choices: [
          { label: 'Sí', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
      }
    case 'specialConditionDetails':
      return {
        prompt:
          'Cuéntanos brevemente cuál es la condición o qué deberíamos saber para cuidar mejor la clase.',
        inputMode: 'text',
        choices: null,
      }
    case 'teacherPreference':
      return {
        prompt: '¿Prefieren profe hombre, mujer o no tienen preferencia?',
        inputMode: 'choice',
        choices: [
          { label: 'No importa', value: 'none' },
          { label: 'Mujer', value: 'woman' },
          { label: 'Hombre', value: 'man' },
          { label: 'Prefiero no decir', value: 'prefer_not_to_say' },
        ],
      }
    case 'classModality':
      return {
        prompt: '¿Dónde prefieren la clase?',
        inputMode: 'choice',
        choices: [
          { label: 'Sede Llanogrande (Rionegro)', value: 'llanogrande' },
          { label: 'Clase a domicilio', value: 'domicilio' },
        ],
      }
    case 'neighborhood':
      return {
        prompt: '¿En qué barrio o zona viven? (Nos ayuda a ubicarlos y coordinar si es a domicilio.)',
        inputMode: 'text',
        choices: null,
      }
    case 'gradeInterested':
      return {
        prompt: '¿Qué edad tiene el niño o la niña?',
        inputMode: 'choice',
        choices: [
          { label: '3 meses–5 años', value: 'K-5' },
          { label: '6–8 años', value: '6-8' },
          { label: '9–12 años', value: '9-12' },
          { label: 'Otro / consulta general', value: 'Other' },
        ],
      }
    case 'phone':
      return {
        prompt: '¿Cuál número de WhatsApp o celular prefieres para que te contactemos?',
        inputMode: 'text',
        choices: null,
      }
    default:
      return {
        prompt: '¿Me compartes un poco más de información para completar tu solicitud?',
        inputMode: 'text',
        choices: null,
      }
  }
}

export function gradeInterestedLabel(value: string | undefined): string {
  if (!value) return 'No informado'
  return GRADE_LABELS[value] ?? formatAgeRange(value)
}

export function handoffReplyToUser(profile: PeskidsIntakeProfile): string {
  const name = profile.parentName ?? 'familia'
  const conditionNote =
    profile.specialCondition === 'yes'
      ? profile.specialConditionDetails
        ? `Sí — ${profile.specialConditionDetails}`
        : 'Sí'
      : profile.specialCondition === 'no'
        ? 'No'
        : '—'
  return (
    `¡Perfecto, ${name}! Ya tengo todos los datos para tu solicitud de clase de prueba gratis 🎉\n\n` +
    `• Cómo nos conoció: ${profile.referralSource ?? '—'}\n` +
    `• Condición a tener en cuenta: ${conditionNote}\n` +
    `• Preferencia de profe: ${profile.teacherPreference === 'woman' ? 'Mujer' : profile.teacherPreference === 'man' ? 'Hombre' : profile.teacherPreference === 'prefer_not_to_say' ? 'Prefiero no decir' : 'No importa'}\n` +
    `• Modalidad: ${classModalityLabel(profile.classModality)}\n` +
    `• Barrio/zona: ${profile.neighborhood ?? '—'}\n` +
    `• Edad / rango: ${gradeInterestedLabel(profile.gradeInterested)}\n` +
    `• Correo: ${profile.email ?? '—'}\n` +
    `• Teléfono: ${profile.phone ?? '—'}\n\n` +
    `Un asesor de Peskids revisará disponibilidad y te escribirá para confirmar día y hora. ` +
    `Si necesitas algo urgente, puedes volver a escribirnos aquí.`
  )
}

export function buildSupportHandoffDraft(params: {
  profile: PeskidsIntakeProfile
  senderName: string
  senderContact: string
  source: MessageSource
  messageCount: number
  mode?: PeskidsChatMode
}): string {
  const { profile, senderName, senderContact, source, messageCount, mode = 'admissions' } = params
  const channel =
    source === 'whatsapp' ? 'WhatsApp' : source === 'instagram' ? 'Instagram' : 'Web'

  if (mode === 'support') {
    const issueLabel =
      profile.issueType === 'class'
        ? 'Clase'
        : profile.issueType === 'schedule'
          ? 'Horario'
          : profile.issueType === 'reschedule'
            ? 'Reprogramar clase'
            : profile.issueType === 'cancel'
              ? 'Cancelar clase'
        : profile.issueType === 'payment'
          ? 'Pago'
          : profile.issueType === 'attendance'
            ? 'Asistencia'
            : profile.issueType === 'feedback'
              ? 'Feedback'
              : profile.issueType === 'access'
                ? 'Acceso'
                : profile.issueType === 'other'
                  ? 'Otro'
                  : 'No informado'
    const urgencyLabel =
      profile.urgency === 'today'
        ? 'Hoy'
        : profile.urgency === 'this_week'
          ? 'Esta semana'
          : profile.urgency === 'when_possible'
            ? 'Cuando puedan'
            : 'No informado'
    const contactLabel =
      profile.preferredContact === 'chat'
        ? 'Aquí mismo'
        : profile.preferredContact === 'whatsapp'
          ? 'WhatsApp'
          : profile.preferredContact === 'phone'
            ? 'Llamada'
            : profile.preferredContact === 'email'
              ? 'Correo'
              : 'No informado'

    const supportLines = [
      '🛟 Caso de soporte — Peskids',
      `Canal: ${channel}`,
      `Contacto hilo: ${senderContact}`,
      '',
      '--- Datos de soporte ---',
      `Acudiente: ${profile.parentName ?? senderName ?? 'No informado'}`,
      `Estudiante: ${profile.childName ?? 'No informado'}`,
      `Tipo de soporte: ${issueLabel}`,
      `Detalle: ${profile.issueDetails ?? 'No informado'}`,
      `Urgencia: ${urgencyLabel}`,
      `Preferencia de respuesta: ${contactLabel}`,
    ]

    if (profile.phone) supportLines.push(`Teléfono: ${profile.phone}`)
    if (profile.email) supportLines.push(`Correo: ${profile.email}`)

    supportLines.push(
      '',
      `Mensajes en conversación: ${messageCount}`,
      '',
      'Siguiente paso: revisar el caso, responder con el canal preferido y confirmar si requiere seguimiento humano.',
      'No mezclar este hilo con admisiones o reservas nuevas.'
    )

    return supportLines.join('\n')
  }

  const lines = [
    '📋 Lead completo — Peskids (esperando asignación)',
    `Canal: ${channel}`,
    `Contacto hilo: ${senderContact}`,
    '',
    '--- Datos del formulario ---',
    `Acudiente: ${profile.parentName ?? senderName ?? 'No informado'}`,
    `¿Cómo nos conoció?: ${profile.referralSource ?? 'No informado'}`,
    `¿Tiene alguna condición?: ${profile.specialCondition === 'yes' ? 'Sí' : profile.specialCondition === 'no' ? 'No' : 'No informado'}`,
    `Preferencia de profe: ${profile.teacherPreference === 'woman' ? 'Mujer' : profile.teacherPreference === 'man' ? 'Hombre' : profile.teacherPreference === 'prefer_not_to_say' ? 'Prefiero no decir' : 'No importa'}`,
    `Correo: ${profile.email ?? 'No informado'}`,
    `Teléfono: ${profile.phone ?? 'No informado'}`,
    `Modalidad: ${classModalityLabel(profile.classModality)}`,
    `Barrio/zona: ${profile.neighborhood ?? 'No informado'}`,
    `Edad / rango: ${gradeInterestedLabel(profile.gradeInterested)}`,
  ]

  if (profile.childName) lines.push(`Nombre del niño/a (opcional): ${profile.childName}`)
  if (profile.childAge) lines.push(`Edad mencionada (opcional): ${profile.childAge}`)
  if (profile.specialCondition === 'yes' && profile.specialConditionDetails) {
    lines.push(`Detalle de condición: ${profile.specialConditionDetails}`)
  }

  lines.push(
    '',
    `Mensajes en conversación: ${messageCount}`,
    '',
    'Siguiente paso: confirmar cupo, proponer horario de clase de prueba y enviar respuesta final aprobada.',
    'No prometer precio ni horario exacto sin validar con el equipo.'
  )

  return lines.join('\n')
}

/** Texto sugerido al abrir WhatsApp (wa.me prefill). */
export const PESKIDS_WHATSAPP_INTAKE_PREFILL =
  'Hola Peskids 👋 Quiero reservar una clase de prueba gratis. Puedo responder preguntas sobre la clase.'

export const PESKIDS_WHATSAPP_SUPPORT_PREFILL =
  'Hola Peskids 👋 Necesito soporte desde el portal de familias.\n\n1. Nombre del acudiente:\n2. Nombre del estudiante:\n3. ¿Qué necesitas resolver? (clase, horario, reprogramar clase, cancelar clase, pago, asistencia, feedback o acceso)\n4. ¿Qué pasó?\n5. ¿Cómo prefieres que te respondamos?'
