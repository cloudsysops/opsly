import type { MessageSource } from '@/lib/message-store'
import { classModalityLabel } from '@/lib/lead-modality'

export type PeskidsIntakeStage = 'collecting' | 'handoff'

type PeskidsClassModality = 'llanogrande' | 'domicilio'

export type PeskidsIntakeProfile = {
  parentName?: string
  email?: string
  phone?: string
  classModality?: PeskidsClassModality
  neighborhood?: string
  /** Valores del formulario web: K-5 | 6-8 | 9-12 | Other */
  gradeInterested?: string
  referralSource?: string
  childName?: string
  childAge?: string
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

const GRADE_LABELS: Record<string, string> = {
  'K-5': 'Babyswim / K–5',
  '6-8': '6–8 años (Peces · Delfines)',
  '9-12': '9–12 años (Tiburones · Olímpicos)',
  Other: 'Otro / consulta general',
}

export function gradeInterestedLabel(value: string | undefined): string {
  if (!value) return 'No informado'
  return GRADE_LABELS[value] ?? value
}

export function handoffReplyToUser(profile: PeskidsIntakeProfile): string {
  const name = profile.parentName ?? 'familia'
  return (
    `¡Perfecto, ${name}! Ya tengo todos los datos para tu solicitud de clase de prueba gratis 🎉\n\n` +
    `• Modalidad: ${classModalityLabel(profile.classModality)}\n` +
    `• Barrio/zona: ${profile.neighborhood ?? '—'}\n` +
    `• Edad o nivel: ${gradeInterestedLabel(profile.gradeInterested)}\n` +
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
}): string {
  const { profile, senderName, senderContact, source, messageCount } = params
  const channel =
    source === 'whatsapp' ? 'WhatsApp' : source === 'instagram' ? 'Instagram' : 'Web'

  const lines = [
    '📋 Lead completo — Peskids (listo para soporte humano)',
    `Canal: ${channel}`,
    `Contacto hilo: ${senderContact}`,
    '',
    '--- Datos del formulario ---',
    `Acudiente: ${profile.parentName ?? senderName ?? 'No informado'}`,
    `Correo: ${profile.email ?? 'No informado'}`,
    `Teléfono: ${profile.phone ?? 'No informado'}`,
    `Modalidad: ${classModalityLabel(profile.classModality)}`,
    `Barrio/zona: ${profile.neighborhood ?? 'No informado'}`,
    `Edad o nivel: ${gradeInterestedLabel(profile.gradeInterested)}`,
  ]

  if (profile.childName) lines.push(`Nombre del niño/a (opcional): ${profile.childName}`)
  if (profile.childAge) lines.push(`Edad mencionada (opcional): ${profile.childAge}`)
  if (profile.referralSource) lines.push(`¿Cómo nos conoció?: ${profile.referralSource}`)

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
  'Hola Peskids 👋 Quiero reservar una clase de prueba gratis. Estoy listo/a para responder unas preguntas cortas.'
