import type { MessageSource } from '@/lib/message-store'
import { getConversationMessages } from '@/lib/message-store'

export type PeskidsIntakeStage = 'collecting' | 'handoff'

type PeskidsClassModality = 'llanogrande' | 'domicilio'
type PeskidsGoal = 'prueba' | 'informacion' | 'horarios' | 'inscripcion' | 'precio'

export type PeskidsIntakeProfile = {
  parentName?: string
  childName?: string
  childAge?: string
  classModality?: PeskidsClassModality
  neighborhood?: string
  goal?: PeskidsGoal
  contactPoint?: string
}

export type PeskidsIntakeTurn = {
  stage: PeskidsIntakeStage
  progress: number
  reply: string
  supportDraft: string | null
  profile: PeskidsIntakeProfile
  missingField: string | null
  capturedFields: string[]
}

const GENERIC_NAMES = new Set(['contacto', 'visitante', 'visitante web', 'guest', 'assistant', 'asistente', 'asistente peskids'])

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').replace(/[“”]/g, '"')
}

function normalizeName(value: string): string {
  return normalizeText(value).replace(/^[-:,.\s]+/, '').replace(/[\s,.!?]+$/, '')
}

function isGenericName(value?: string | null): boolean {
  if (!value) return true
  return GENERIC_NAMES.has(value.trim().toLowerCase())
}

function extractEmail(text: string): string | undefined {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match?.[0]
}

function extractPhone(text: string): string | undefined {
  const match = text.match(/(\+?\d[\d\s().-]{7,}\d)/)
  return match?.[1]?.replace(/\s+/g, ' ').trim()
}

function extractParentName(text: string): string | undefined {
  const patterns = [
    /(?:soy|me llamo|mi nombre es)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]{1,45})/i,
    /(?:acudiente|mamá|mama|papá|papa)\s*:?\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]{1,45})/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return normalizeName(match[1])
  }
  return undefined
}

function extractChildName(text: string): string | undefined {
  const patterns = [
    /(?:mi hijo|mi hija|mi niño|mi niña)\s+(?:se llama\s+)?([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]{1,45})/i,
    /(?:se llama|nombre del niño|nombre de la niña)\s*:?\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]{1,45})/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return normalizeName(match[1])
  }
  return undefined
}

function extractChildAge(text: string): string | undefined {
  const match = text.match(/(\d{1,2})\s*(años?|año|meses?|mes)/i)
  if (!match) return undefined
  return `${match[1]} ${match[2].toLowerCase()}`
}

function extractClassModality(text: string): PeskidsClassModality | undefined {
  const lower = text.toLowerCase()
  if (lower.includes('domicilio') || lower.includes('a domicilio')) return 'domicilio'
  if (lower.includes('sede') || lower.includes('llanogrande')) return 'llanogrande'
  return undefined
}

function extractNeighborhood(text: string): string | undefined {
  const patterns = [
    /(?:vivo en|vivimos en|barrio|zona)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s.'-]{2,60})/i,
    /(?:en el barrio|en la zona)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s.'-]{2,60})/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return normalizeName(match[1])
  }
  return undefined
}

function extractGoal(text: string): PeskidsGoal | undefined {
  const lower = text.toLowerCase()
  if (lower.includes('prueba') || lower.includes('clase de prueba')) return 'prueba'
  if (lower.includes('horario') || lower.includes('horarios')) return 'horarios'
  if (lower.includes('precio') || lower.includes('costo') || lower.includes('tarifa')) return 'precio'
  if (lower.includes('inscrip') || lower.includes('matric')) return 'inscripcion'
  if (lower.includes('información') || lower.includes('informacion') || lower.includes('info')) {
    return 'informacion'
  }
  return undefined
}

function profileFromText(text: string): Partial<PeskidsIntakeProfile> {
  return {
    parentName: extractParentName(text),
    childName: extractChildName(text),
    childAge: extractChildAge(text),
    classModality: extractClassModality(text),
    neighborhood: extractNeighborhood(text),
    goal: extractGoal(text),
    contactPoint: extractEmail(text) ?? extractPhone(text),
  }
}

function mergeProfile(base: PeskidsIntakeProfile, update: Partial<PeskidsIntakeProfile>): PeskidsIntakeProfile {
  return {
    parentName: base.parentName ?? update.parentName,
    childName: base.childName ?? update.childName,
    childAge: base.childAge ?? update.childAge,
    classModality: base.classModality ?? update.classModality,
    neighborhood: base.neighborhood ?? update.neighborhood,
    goal: base.goal ?? update.goal,
    contactPoint: base.contactPoint ?? update.contactPoint,
  }
}

function questionForField(field: string, profile: PeskidsIntakeProfile): string {
  switch (field) {
    case 'parentName':
      return '¿Cómo te llamas como acudiente?'
    case 'childName':
      return `Gracias${profile.parentName ? `, ${profile.parentName}` : ''}. ¿Cómo se llama el niño o la niña?`
    case 'childAge':
      return `Perfecto${profile.childName ? `, sobre ${profile.childName}` : ''}. ¿Qué edad tiene?`
    case 'classModality':
      return '¿Buscan clases en sede Llanogrande o a domicilio?'
    case 'neighborhood':
      return '¿En qué barrio o zona viven para revisar si aplica a domicilio?'
    case 'goal':
      return '¿Buscan clase de prueba, horarios o información general?'
    case 'contactPoint':
      return '¿Me compartes un número de contacto o correo para confirmar la información?'
    default:
      return '¿Me compartes un poco más de información para ayudarte mejor?'
  }
}

function buildSupportDraft(profile: PeskidsIntakeProfile, senderName: string, historyCount: number): string {
  const lines = [
    'Resumen de intake Peskids:',
    `- Acudiente: ${profile.parentName ?? senderName ?? 'No informado'}`,
    `- Niño(a): ${profile.childName ?? 'No informado'}`,
    `- Edad: ${profile.childAge ?? 'No informado'}`,
    `- Modalidad: ${profile.classModality ?? 'No informado'}`,
    `- Barrio/Zona: ${profile.neighborhood ?? 'No aplica / no informado'}`,
    `- Objetivo: ${profile.goal ?? 'No informado'}`,
    `- Contacto adicional: ${profile.contactPoint ?? 'No informado'}`,
    `- Mensajes analizados: ${historyCount}`,
    '',
    'Siguiente paso sugerido: revisar disponibilidad, confirmar clase de prueba y cerrar respuesta final con aprobación humana.',
  ]
  return lines.join('\n')
}

function formatProgress(captured: number, required: number): number {
  if (required <= 0) return 1
  return Math.min(1, captured / required)
}

export async function buildPeskidsIntakeTurn(params: {
  senderContact: string
  senderName?: string
  source: MessageSource
  latestMessage: string
}): Promise<PeskidsIntakeTurn> {
  const history = await getConversationMessages(params.senderContact, 12)
  const inboundHistory = history.filter((message) => message.direction === 'inbound' || !message.direction)

  let profile: PeskidsIntakeProfile = {}
  for (const message of inboundHistory) {
    profile = mergeProfile(profile, profileFromText(message.message_text))
  }

  if (!profile.parentName && params.senderName && !isGenericName(params.senderName)) {
    profile.parentName = normalizeName(params.senderName)
  }

  if (params.latestMessage) {
    profile = mergeProfile(profile, profileFromText(params.latestMessage))
  }

  const requiresDirectContact = params.source !== 'whatsapp'
  const requiredOrder: Array<keyof PeskidsIntakeProfile> = [
    'parentName',
    'childName',
    'childAge',
    'classModality',
    'goal',
  ]

  if (profile.classModality === 'domicilio') {
    requiredOrder.push('neighborhood')
  }

  if (requiresDirectContact) {
    requiredOrder.push('contactPoint')
  }

  const missingField = requiredOrder.find((field) => !profile[field]) ?? null
  const capturedFields = requiredOrder.filter((field) => Boolean(profile[field])).map(String)
  const stage = missingField ? 'collecting' : 'handoff'
  const progress = formatProgress(capturedFields.length, requiredOrder.length)

  const reply = missingField
    ? questionForField(missingField, profile)
    : '¡Perfecto! Ya tengo la información. Un asesor de Peskids revisará tu caso y te confirmará el siguiente paso.'
  const supportDraft = missingField ? null : buildSupportDraft(profile, params.senderName ?? 'Contacto', inboundHistory.length)

  return {
    stage,
    progress,
    reply,
    supportDraft,
    profile,
    missingField,
    capturedFields,
  }
}
