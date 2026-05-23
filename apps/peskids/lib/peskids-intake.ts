import type { MessageSource } from '@/lib/message-store'
import { getConversationMessages } from '@/lib/message-store'
import {
  buildSupportHandoffDraft,
  handoffReplyToUser,
  peskidsIntakeWelcome,
  type PeskidsIntakeProfile,
  type PeskidsIntakeStage,
} from '@/lib/peskids-intake-messages'

export type { PeskidsIntakeProfile, PeskidsIntakeStage }

type PeskidsClassModality = NonNullable<PeskidsIntakeProfile['classModality']>

export type PeskidsIntakeTurn = {
  stage: PeskidsIntakeStage
  progress: number
  reply: string
  supportDraft: string | null
  profile: PeskidsIntakeProfile
  missingField: string | null
  capturedFields: string[]
}

const GENERIC_NAMES = new Set([
  'contacto',
  'visitante',
  'visitante web',
  'guest',
  'assistant',
  'asistente',
  'asistente peskids',
  'unknown',
])

const GRADE_PATTERNS: Array<{ value: string; test: RegExp }> = [
  { value: 'K-5', test: /\b(babyswim|beb[eé]|bebe|k-?\s*5|3\s*meses|4\s*meses|5\s*meses)\b/i },
  { value: '6-8', test: /\b(6|7|8)\s*(años?|ano)\b|\bpeces\b|\bdelfines\b/i },
  { value: '9-12', test: /\b(9|10|11|12)\s*(años?|ano)\b|\btiburones\b|\bol[ií]mpicos\b/i },
  { value: 'Other', test: /\b(otro|consulta general|adolescente|15\s*años)\b/i },
]

const REFERRAL_PATTERNS: Array<{ value: string; test: RegExp }> = [
  { value: 'Instagram', test: /\b(instagram|ig|reels?|historia)\b/i },
  { value: 'Google', test: /\b(google|busqu[eé]|internet)\b/i },
  { value: 'Friend', test: /\b(amig[oa]|recomendaci[oó]n|referid[oa]|conocid[oa])\b/i },
]

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
  return match?.[0]?.toLowerCase()
}

function extractPhone(text: string): string | undefined {
  const match = text.match(/(\+?57\s?)?(\d{3})[\s.-]?(\d{3})[\s.-]?(\d{4})/)
  if (match) {
    const digits = (match[1] ?? '') + match[2] + match[3] + match[4]
    return digits.replace(/\D/g, '')
  }
  const loose = text.match(/(\+?\d[\d\s().-]{8,}\d)/)
  return loose?.[1]?.replace(/\D/g, '')
}

export function phoneFromSenderContact(senderContact: string): string | undefined {
  const digits = senderContact.replace(/\D/g, '')
  if (digits.length >= 10) return digits
  return undefined
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
  if (lower.includes('domicilio') || lower.includes('a domicilio') || lower.includes('en casa')) {
    return 'domicilio'
  }
  if (
    lower.includes('sede') ||
    lower.includes('llanogrande') ||
    lower.includes('rionegro') ||
    lower.includes('en la piscina')
  ) {
    return 'llanogrande'
  }
  if (/\b(1|uno|primera)\b/.test(lower) && lower.includes('opc')) return 'llanogrande'
  if (/\b(2|dos|segunda)\b/.test(lower) && lower.includes('opc')) return 'domicilio'
  return undefined
}

function extractNeighborhood(text: string): string | undefined {
  const patterns = [
    /(?:vivo en|vivimos en|barrio|zona|sector)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s.'-]{2,60})/i,
    /(?:en el barrio|en la zona|en)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s.'-]{2,50})/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      const value = normalizeName(match[1])
      if (!/^(sede|domicilio|llanogrande)$/i.test(value)) return value
    }
  }
  return undefined
}

function extractGradeInterested(text: string): string | undefined {
  const upper = text.toUpperCase()
  if (/\bK-?5\b/.test(upper)) return 'K-5'
  if (/\b6-?8\b/.test(upper)) return '6-8'
  if (/\b9-?12\b/.test(upper)) return '9-12'
  for (const { value, test } of GRADE_PATTERNS) {
    if (test.test(text)) return value
  }
  const age = extractChildAge(text)
  if (age) {
    const n = parseInt(age, 10)
    if (!Number.isNaN(n)) {
      if (n <= 5 || age.includes('mes')) return 'K-5'
      if (n >= 6 && n <= 8) return '6-8'
      if (n >= 9) return '9-12'
    }
  }
  return undefined
}

function extractReferralSource(text: string): string | undefined {
  for (const { value, test } of REFERRAL_PATTERNS) {
    if (test.test(text)) return value
  }
  return undefined
}

function profileFromText(text: string): Partial<PeskidsIntakeProfile> {
  return {
    parentName: extractParentName(text),
    email: extractEmail(text),
    phone: extractPhone(text),
    childName: extractChildName(text),
    childAge: extractChildAge(text),
    classModality: extractClassModality(text),
    neighborhood: extractNeighborhood(text),
    gradeInterested: extractGradeInterested(text),
    referralSource: extractReferralSource(text),
  }
}

function mergeProfile(base: PeskidsIntakeProfile, update: Partial<PeskidsIntakeProfile>): PeskidsIntakeProfile {
  return {
    parentName: base.parentName ?? update.parentName,
    email: base.email ?? update.email,
    phone: base.phone ?? update.phone,
    classModality: base.classModality ?? update.classModality,
    neighborhood: base.neighborhood ?? update.neighborhood,
    gradeInterested: base.gradeInterested ?? update.gradeInterested,
    referralSource: base.referralSource ?? update.referralSource,
    childName: base.childName ?? update.childName,
    childAge: base.childAge ?? update.childAge,
  }
}

function questionForField(field: string, profile: PeskidsIntakeProfile): string {
  switch (field) {
    case 'parentName':
      return 'Para empezar, ¿cómo te llamas (nombre del acudiente)?'
    case 'email':
      return `Gracias${profile.parentName ? `, ${profile.parentName}` : ''}. ¿Cuál es tu correo electrónico? Lo usamos para confirmar la clase de prueba.`
    case 'classModality':
      return (
        '¿Dónde prefieren la clase?\n' +
        '1️⃣ Sede Llanogrande (Rionegro)\n' +
        '2️⃣ Clase a domicilio en el área metropolitana'
      )
    case 'neighborhood':
      return '¿En qué barrio o zona viven? (Nos ayuda a ubicarlos y coordinar si es a domicilio.)'
    case 'gradeInterested':
      return (
        '¿Qué edad o nivel tiene el niño o la niña?\n' +
        '• Babyswim / K–5 (desde 3 meses)\n' +
        '• 6–8 años (Peces · Delfines)\n' +
        '• 9–12 años (Tiburones · Olímpicos)\n' +
        '• Otro / consulta general'
      )
    case 'phone':
      return '¿Cuál número de WhatsApp o celular prefieres para que te contactemos?'
  default:
      return '¿Me compartes un poco más de información para completar tu solicitud?'
  }
}

function formatProgress(captured: number, required: number): number {
  if (required <= 0) return 1
  return Math.min(1, captured / required)
}

function isGreetingOnly(text: string): boolean {
  const t = text.trim().toLowerCase()
  return /^(hola|buenas|buenos d[ií]as|buenas tardes|buenas noches|hey|hi|hello|saludos|buen d[ií]a)[!.?\s]*$/i.test(
    t
  )
}

function requiredFieldOrder(profile: PeskidsIntakeProfile): Array<keyof PeskidsIntakeProfile> {
  const order: Array<keyof PeskidsIntakeProfile> = [
    'parentName',
    'email',
    'classModality',
    'neighborhood',
    'gradeInterested',
  ]
  if (!profile.phone) order.push('phone')
  return order
}

function firstMissingField(profile: PeskidsIntakeProfile): keyof PeskidsIntakeProfile | null {
  return requiredFieldOrder(profile).find((field) => !profile[field]) ?? null
}

/** Asigna la respuesta directa del usuario al campo que acabamos de preguntar. */
function applyDirectAnswer(
  field: keyof PeskidsIntakeProfile,
  text: string
): Partial<PeskidsIntakeProfile> {
  const trimmed = normalizeText(text)
  if (!trimmed || isGreetingOnly(trimmed)) return {}

  switch (field) {
    case 'parentName': {
      if (extractEmail(trimmed) || extractPhone(trimmed)) return {}
      const name = extractParentName(trimmed) ?? normalizeName(trimmed)
      if (name.length < 2 || name.length > 60) return {}
      return { parentName: name }
    }
    case 'email': {
      const email = extractEmail(trimmed)
      return email ? { email } : {}
    }
    case 'phone': {
      const phone = extractPhone(trimmed)
      return phone ? { phone } : {}
    }
    case 'classModality': {
      const modality = extractClassModality(trimmed)
      return modality ? { classModality: modality } : {}
    }
    case 'neighborhood': {
      const neighborhood = extractNeighborhood(trimmed) ?? normalizeName(trimmed)
      if (neighborhood.length < 2) return {}
      return { neighborhood }
    }
    case 'gradeInterested': {
      const grade = extractGradeInterested(trimmed)
      if (grade) return { gradeInterested: grade }
      if (trimmed.length <= 40) return { gradeInterested: trimmed }
      return {}
    }
    default:
      return {}
  }
}

export async function buildPeskidsIntakeTurn(params: {
  senderContact: string
  senderName?: string
  source: MessageSource
  latestMessage: string
}): Promise<PeskidsIntakeTurn> {
  const history = await getConversationMessages(params.senderContact, 16)
  const inboundHistory = history.filter((message) => message.direction === 'inbound' || !message.direction)

  let profile: PeskidsIntakeProfile = {}

  if (params.source === 'whatsapp') {
    const fromWa = phoneFromSenderContact(params.senderContact)
    if (fromWa) profile.phone = fromWa
  }

  const priorInbound = inboundHistory.filter(
    (message) => message.message_text.trim() !== params.latestMessage.trim()
  )

  for (const message of priorInbound) {
    profile = mergeProfile(profile, profileFromText(message.message_text))
  }

  if (!profile.parentName && params.senderName && !isGenericName(params.senderName)) {
    profile.parentName = normalizeName(params.senderName)
  }

  const missingBeforeLatest = firstMissingField(profile)

  if (params.latestMessage) {
    profile = mergeProfile(profile, profileFromText(params.latestMessage))
    if (missingBeforeLatest && !profile[missingBeforeLatest]) {
      profile = mergeProfile(profile, applyDirectAnswer(missingBeforeLatest, params.latestMessage))
    }
  }

  const requiredOrder = requiredFieldOrder(profile)
  const missingField = requiredOrder.find((field) => !profile[field]) ?? null
  const capturedFields = requiredOrder.filter((field) => Boolean(profile[field])).map(String)
  const stage = missingField ? 'collecting' : 'handoff'
  const progress = formatProgress(capturedFields.length, requiredOrder.length)

  const isFirstTurn = inboundHistory.length <= 1
  const showWelcome = isFirstTurn && (isGreetingOnly(params.latestMessage) || capturedFields.length === 0)

  let reply: string
  if (missingField) {
    const question = questionForField(missingField, profile)
    reply = showWelcome ? `${peskidsIntakeWelcome(params.source)}\n\n${question}` : question
  } else {
    reply = handoffReplyToUser(profile)
  }

  const supportDraft = missingField
    ? null
    : buildSupportHandoffDraft({
        profile,
        senderName: params.senderName ?? 'Contacto',
        senderContact: params.senderContact,
        source: params.source,
        messageCount: inboundHistory.length,
      })

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
