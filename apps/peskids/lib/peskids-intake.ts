import type { MessageSource } from '@/lib/message-store';
import { getConversationMessages } from '@/lib/message-store';
import {
  buildSupportHandoffDraft,
  handoffReplyToUser,
  peskidsIntakeWelcome,
  peskidsSupportWelcome,
  questionSpecForField,
  type PeskidsChatMode,
  type PeskidsIntakeChoice,
  type PeskidsIntakeInputMode,
  type PeskidsIntakeProfile,
  type PeskidsIntakeStage,
} from '@/lib/peskids-intake-messages';

export type { PeskidsIntakeProfile, PeskidsIntakeStage };

type PeskidsClassModality = NonNullable<PeskidsIntakeProfile['classModality']>;

export type PeskidsIntakeTurn = {
  stage: PeskidsIntakeStage;
  /** 0-1 completion ratio (= progress). Alias for semantic clarity in callers. */
  confidence: number;
  progress: number;
  /** Total inbound turns seen for this sender (used for ECC stuck-loop detection). */
  turnCount: number;
  reply: string;
  supportDraft: string | null;
  profile: PeskidsIntakeProfile;
  missingField: string | null;
  capturedFields: string[];
  inputMode: PeskidsIntakeInputMode;
  quickReplies: PeskidsIntakeChoice[] | null;
};

const GENERIC_NAMES = new Set([
  'contacto',
  'visitante',
  'visitante web',
  'guest',
  'assistant',
  'asistente',
  'asistente peskids',
  'unknown',
]);

const GRADE_PATTERNS: Array<{ value: string; test: RegExp }> = [
  { value: 'K-5', test: /\b(babyswim|beb[eé]|bebe|k-?\s*5|3\s*meses|4\s*meses|5\s*meses)\b/i },
  { value: '6-8', test: /\b(6|7|8)\s*(años?|ano)\b|\bpeces\b|\bdelfines\b/i },
  { value: '9-12', test: /\b(9|10|11|12)\s*(años?|ano)\b|\btiburones\b|\bol[ií]mpicos\b/i },
  { value: 'Other', test: /\b(otro|consulta general|adolescente|15\s*años)\b/i },
];

const REFERRAL_PATTERNS: Array<{ value: string; test: RegExp }> = [
  { value: 'Referido', test: /\b(amig[oa]|recomendaci[oó]n|referid[oa]|conocid[oa])\b/i },
  { value: 'Instagram', test: /\b(instagram|ig|reels?|historia)\b/i },
  { value: 'Página web', test: /\b(p[aá]gina web|web|sitio web|website)\b/i },
  { value: 'WhatsApp', test: /\b(whatsapp|wa\.?me)\b/i },
  { value: 'Google / buscador', test: /\b(google|busqu[eé]|internet|buscador)\b/i },
  { value: 'Google Maps', test: /\b(google maps?|maps)\b/i },
  { value: 'Facebook', test: /\b(facebook|fb)\b/i },
  { value: 'Otro', test: /\b(otro|otros)\b/i },
];

const SPECIAL_CONDITION_PATTERNS: Array<{ value: 'yes' | 'no'; test: RegExp }> = [
  {
    value: 'yes',
    test: /\b(s[ií]|sí|si)\b.*\b(condici[oó]n|asma|alerg|epilep|autis|tdah|discap|respir|cardi|medic|cirug|limit)\b/i,
  },
  {
    value: 'yes',
    test: /\b(condici[oó]n|asma|alerg|epilep|autis|tdah|discap|respir|cardi|medic|cirug|limit)\b/i,
  },
  { value: 'no', test: /\b(no|ninguna|ninguno|nada)\b/i },
];

const TEACHER_PREFERENCE_PATTERNS: Array<{
  value: NonNullable<PeskidsIntakeProfile['teacherPreference']>;
  test: RegExp;
}> = [
  { value: 'woman', test: /\b(mujer|femenin[oa]|profe mujer|profesora)\b/i },
  { value: 'man', test: /\b(hombre|masculin[oa]|profe hombre|profesor)\b/i },
  {
    value: 'prefer_not_to_say',
    test: /\b(prefiero no decir|prefiero no responder|sin decir|no quiero decir)\b/i,
  },
  { value: 'none', test: /\b(no importa|cualquiera|sin preferencia|me da igual)\b/i },
];

const ISSUE_TYPE_PATTERNS: Array<{
  value: NonNullable<PeskidsIntakeProfile['issueType']>;
  test: RegExp;
}> = [
  { value: 'class', test: /\b(clase|clases|profesor|profesora|instructor|instructora)\b/i },
  { value: 'schedule', test: /\b(horario|hora|agenda|turno|cambio de turno|reagendar)\b/i },
  { value: 'reschedule', test: /\b(reprogramar|reagendar|mover la clase|cambiar la clase)\b/i },
  { value: 'cancel', test: /\b(cancelar|cancelaci[oó]n|anular la clase|suspender la clase)\b/i },
  { value: 'payment', test: /\b(pago|factura|cobro|transferencia|saldo|cuenta)\b/i },
  {
    value: 'attendance',
    test: /\b(asistencia|falt[ao]|\bno pudo ir\b|\bno asist[ií]|\bausencia)\b/i,
  },
  { value: 'feedback', test: /\b(feedback|retroalimentaci[oó]n|comentario|nota)\b/i },
  { value: 'access', test: /\b(acceso|entrar|login|contraseñ|password|usuario)\b/i },
  { value: 'other', test: /\b(otro|ayuda general|soporte|consulta)\b/i },
];

const URGENCY_PATTERNS: Array<{
  value: NonNullable<PeskidsIntakeProfile['urgency']>;
  test: RegExp;
}> = [
  { value: 'today', test: /\b(hoy|ahora|urgente|ya)\b/i },
  { value: 'this_week', test: /\b(esta semana|durante la semana|en estos d[ií]as)\b/i },
  { value: 'when_possible', test: /\b(cuando puedan|sin afán|tranquilo|no urgente)\b/i },
];

const SUPPORT_CONTACT_PATTERNS: Array<{
  value: NonNullable<PeskidsIntakeProfile['preferredContact']>;
  test: RegExp;
}> = [
  { value: 'chat', test: /\b(aqu[ií] mismo|mismo chat|por aqu[ií]|chat)\b/i },
  { value: 'whatsapp', test: /\b(whatsapp|wa\.?me)\b/i },
  { value: 'phone', test: /\b(llamada|llámenme|telefono|tel[eé]fono|celular)\b/i },
  { value: 'email', test: /\b(correo|email|mail)\b/i },
];

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').replace(/[“”]/g, '"');
}

function normalizeName(value: string): string {
  return normalizeText(value)
    .replace(/^[-:,.\s]+/, '')
    .replace(/[\s,.!?]+$/, '');
}

function isGenericName(value?: string | null): boolean {
  if (!value) return true;
  return GENERIC_NAMES.has(value.trim().toLowerCase());
}

function extractEmail(text: string): string | undefined {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.toLowerCase();
}

function extractPhone(text: string): string | undefined {
  const match = text.match(/(\+?57\s?)?(\d{3})[\s.-]?(\d{3})[\s.-]?(\d{4})/);
  if (match) {
    const digits = (match[1] ?? '') + match[2] + match[3] + match[4];
    return digits.replace(/\D/g, '');
  }
  const loose = text.match(/(\+?\d[\d\s().-]{8,}\d)/);
  return loose?.[1]?.replace(/\D/g, '');
}

export function phoneFromSenderContact(senderContact: string): string | undefined {
  const digits = senderContact.replace(/\D/g, '');
  if (digits.length >= 10) return digits;
  return undefined;
}

function extractParentName(text: string): string | undefined {
  const patterns = [
    /(?:soy|me llamo|mi nombre es)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]{1,45})/i,
    /(?:acudiente|mamá|mama|papá|papa)\s*:?\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]{1,45})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return normalizeName(match[1]);
  }
  return undefined;
}

function extractChildName(text: string): string | undefined {
  const patterns = [
    /(?:mi hijo|mi hija|mi niño|mi niña)\s+(?:se llama\s+)?([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]{1,45})/i,
    /(?:se llama|nombre del niño|nombre de la niña)\s*:?\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]{1,45})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return normalizeName(match[1]);
  }
  return undefined;
}

function extractChildAge(text: string): string | undefined {
  const match = text.match(/(\d{1,2})\s*(años?|año|meses?|mes)/i);
  if (!match) return undefined;
  return `${match[1]} ${match[2].toLowerCase()}`;
}

function extractClassModality(text: string): PeskidsClassModality | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('domicilio') || lower.includes('a domicilio') || lower.includes('en casa')) {
    return 'domicilio';
  }
  if (
    lower.includes('sede') ||
    lower.includes('llanogrande') ||
    lower.includes('rionegro') ||
    lower.includes('en la piscina')
  ) {
    return 'llanogrande';
  }
  if (/\b(1|uno|primera)\b/.test(lower) && lower.includes('opc')) return 'llanogrande';
  if (/\b(2|dos|segunda)\b/.test(lower) && lower.includes('opc')) return 'domicilio';
  return undefined;
}

function extractNeighborhood(text: string): string | undefined {
  const patterns = [
    /(?:vivo en|vivimos en|barrio|zona|sector)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s.'-]{2,60})/i,
    /(?:en el barrio|en la zona|en)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s.'-]{2,50})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = normalizeName(match[1]);
      if (!/^(sede|domicilio|llanogrande)$/i.test(value)) return value;
    }
  }
  return undefined;
}

function extractGradeInterested(text: string): string | undefined {
  const upper = text.toUpperCase();
  if (/\bK-?5\b/.test(upper)) return 'K-5';
  if (/\b6-?8\b/.test(upper)) return '6-8';
  if (/\b9-?12\b/.test(upper)) return '9-12';
  for (const { value, test } of GRADE_PATTERNS) {
    if (test.test(text)) return value;
  }
  const age = extractChildAge(text);
  if (age) {
    const n = parseInt(age, 10);
    if (!Number.isNaN(n)) {
      if (n <= 5 || age.includes('mes')) return 'K-5';
      if (n >= 6 && n <= 8) return '6-8';
      if (n >= 9) return '9-12';
    }
  }
  return undefined;
}

function extractReferralSource(text: string): string | undefined {
  for (const { value, test } of REFERRAL_PATTERNS) {
    if (test.test(text)) return value;
  }
  return undefined;
}

function extractSpecialCondition(
  text: string
): PeskidsIntakeProfile['specialCondition'] | undefined {
  for (const { value, test } of SPECIAL_CONDITION_PATTERNS) {
    if (test.test(text)) return value;
  }
  return undefined;
}

function extractTeacherPreference(
  text: string
): PeskidsIntakeProfile['teacherPreference'] | undefined {
  for (const { value, test } of TEACHER_PREFERENCE_PATTERNS) {
    if (test.test(text)) return value;
  }
  return undefined;
}

function extractIssueType(text: string): PeskidsIntakeProfile['issueType'] | undefined {
  for (const { value, test } of ISSUE_TYPE_PATTERNS) {
    if (test.test(text)) return value;
  }
  return undefined;
}

function extractUrgency(text: string): PeskidsIntakeProfile['urgency'] | undefined {
  for (const { value, test } of URGENCY_PATTERNS) {
    if (test.test(text)) return value;
  }
  return undefined;
}

function extractPreferredContact(
  text: string
): PeskidsIntakeProfile['preferredContact'] | undefined {
  for (const { value, test } of SUPPORT_CONTACT_PATTERNS) {
    if (test.test(text)) return value;
  }
  return undefined;
}

function extractApplicantRole(text: string): PeskidsIntakeProfile['applicantRole'] | undefined {
  const t = normalizeText(text).toLowerCase();
  if (t === 'family' || t === 'familia' || t === 'familia / matrícula' || t === 'familia / matricula') {
    return 'family';
  }
  if (
    t === 'teacher_applicant' ||
    t === 'profesor' ||
    t === 'profesora' ||
    t.includes('quiero ser profesor')
  ) {
    return 'teacher_applicant';
  }
  if (
    t === 'company' ||
    t === 'empresa' ||
    t.includes('empresa o institución') ||
    t.includes('empresa o institucion')
  ) {
    return 'company';
  }
  // Solo frases cortas de chip / intención clara (evita contaminar el nombre).
  if (t.length <= 40) {
    if (/^(familia|matr[ií]cula)\b/.test(t)) return 'family';
    if (/\b(profesor|profesora|instructor|docente)\b/.test(t)) return 'teacher_applicant';
    if (/\b(empresa|instituci[oó]n)\b/.test(t)) return 'company';
  }
  return undefined;
}

function profileFromText(text: string): Partial<PeskidsIntakeProfile> {
  return {
    applicantRole: extractApplicantRole(text),
    parentName: extractParentName(text),
    email: extractEmail(text),
    phone: extractPhone(text),
    specialCondition: extractSpecialCondition(text),
    teacherPreference: extractTeacherPreference(text),
    childName: extractChildName(text),
    childAge: extractChildAge(text),
    classModality: extractClassModality(text),
    neighborhood: extractNeighborhood(text),
    gradeInterested: extractGradeInterested(text),
    referralSource: extractReferralSource(text),
    issueType: extractIssueType(text),
    urgency: extractUrgency(text),
    preferredContact: extractPreferredContact(text),
  };
}

function mergeProfile(
  base: PeskidsIntakeProfile,
  update: Partial<PeskidsIntakeProfile>
): PeskidsIntakeProfile {
  return {
    applicantRole: base.applicantRole ?? update.applicantRole,
    parentName: base.parentName ?? update.parentName,
    email: base.email ?? update.email,
    phone: base.phone ?? update.phone,
    specialCondition: base.specialCondition ?? update.specialCondition,
    specialConditionDetails: base.specialConditionDetails ?? update.specialConditionDetails,
    teacherPreference: base.teacherPreference ?? update.teacherPreference,
    classModality: base.classModality ?? update.classModality,
    neighborhood: base.neighborhood ?? update.neighborhood,
    gradeInterested: base.gradeInterested ?? update.gradeInterested,
    referralSource: base.referralSource ?? update.referralSource,
    childName: base.childName ?? update.childName,
    childAge: base.childAge ?? update.childAge,
    companyName: base.companyName ?? update.companyName,
    issueType: base.issueType ?? update.issueType,
    issueDetails: base.issueDetails ?? update.issueDetails,
    urgency: base.urgency ?? update.urgency,
    preferredContact: base.preferredContact ?? update.preferredContact,
    consentTreatment: base.consentTreatment ?? update.consentTreatment,
  };
}

function formatProgress(captured: number, required: number): number {
  if (required <= 0) return 1;
  return Math.min(1, captured / required);
}

function isGreetingOnly(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^(hola|buenas|buenos d[ií]as|buenas tardes|buenas noches|hey|hi|hello|saludos|buen d[ií]a)[!.?\s]*$/i.test(
    t
  );
}

function requiredFieldOrder(
  profile: PeskidsIntakeProfile,
  mode: PeskidsChatMode
): Array<keyof PeskidsIntakeProfile> {
  if (mode === 'support') {
    const order: Array<keyof PeskidsIntakeProfile> = [
      'parentName',
      'childName',
      'issueType',
      'issueDetails',
      'urgency',
      'preferredContact',
    ];
    if (!profile.phone) order.push('phone');
    if (!profile.email) order.push('email');
    return order;
  }

  // Profesor / empresa: flujo corto → WhatsApp humano.
  if (profile.applicantRole === 'teacher_applicant') {
    return ['applicantRole', 'parentName', 'phone', 'email', 'consentTreatment'];
  }
  if (profile.applicantRole === 'company') {
    return ['applicantRole', 'parentName', 'companyName', 'phone', 'email', 'consentTreatment'];
  }

  const order: Array<keyof PeskidsIntakeProfile> = [
    'applicantRole',
    'parentName',
    'classModality',
    'neighborhood',
    'gradeInterested',
    'phone',
    'email',
    'referralSource',
    'specialCondition',
    'teacherPreference',
    'consentTreatment',
  ];
  if (profile.specialCondition === 'yes' && !profile.specialConditionDetails) {
    const idx = order.indexOf('specialCondition') + 1;
    order.splice(idx, 0, 'specialConditionDetails');
  }
  // Sede Llanogrande: no pedir barrio aparte — se fija automáticamente.
  if (profile.classModality === 'llanogrande') {
    return order.filter((field) => field !== 'neighborhood');
  }
  return order;
}

function fieldIsCaptured(
  profile: PeskidsIntakeProfile,
  field: keyof PeskidsIntakeProfile
): boolean {
  if (field === 'consentTreatment') return profile.consentTreatment === 'yes';
  return Boolean(profile[field]);
}

function firstMissingField(
  profile: PeskidsIntakeProfile,
  mode: PeskidsChatMode
): keyof PeskidsIntakeProfile | null {
  return requiredFieldOrder(profile, mode).find((field) => !fieldIsCaptured(profile, field)) ?? null;
}

/** Asigna la respuesta directa del usuario al campo que acabamos de preguntar. */
function applyDirectAnswer(
  field: keyof PeskidsIntakeProfile,
  text: string
): Partial<PeskidsIntakeProfile> {
  const trimmed = normalizeText(text);
  if (!trimmed || isGreetingOnly(trimmed)) return {};

  switch (field) {
    case 'applicantRole': {
      const role = extractApplicantRole(trimmed);
      return role ? { applicantRole: role } : {};
    }
    case 'companyName': {
      if (trimmed.length < 2 || trimmed.length > 120) return {};
      return { companyName: normalizeName(trimmed) };
    }
    case 'parentName': {
      if (extractEmail(trimmed) || extractPhone(trimmed)) return {};
      const name = extractParentName(trimmed) ?? normalizeName(trimmed);
      if (name.length < 2 || name.length > 60) return {};
      return { parentName: name };
    }
    case 'email': {
      const email = extractEmail(trimmed);
      return email ? { email } : {};
    }
    case 'specialCondition': {
      const specialCondition = extractSpecialCondition(trimmed);
      if (specialCondition) return { specialCondition };
      return {};
    }
    case 'specialConditionDetails': {
      if (trimmed.length < 3) return {};
      return { specialConditionDetails: trimmed };
    }
    case 'teacherPreference': {
      const teacherPreference = extractTeacherPreference(trimmed);
      if (teacherPreference) return { teacherPreference };
      return {};
    }
    case 'phone': {
      const phone = extractPhone(trimmed);
      return phone ? { phone } : {};
    }
    case 'classModality': {
      const modality = extractClassModality(trimmed);
      return modality ? { classModality: modality } : {};
    }
    case 'neighborhood': {
      const neighborhood = extractNeighborhood(trimmed) ?? normalizeName(trimmed);
      if (neighborhood.length < 2) return {};
      return { neighborhood };
    }
    case 'gradeInterested': {
      const grade = extractGradeInterested(trimmed);
      if (grade) return { gradeInterested: grade };
      if (trimmed.length <= 40) return { gradeInterested: trimmed };
      return {};
    }
    case 'referralSource': {
      if (trimmed.length <= 60) return { referralSource: trimmed };
      return {};
    }
    case 'issueType': {
      const issueType = extractIssueType(trimmed);
      if (issueType) return { issueType };
      return {};
    }
    case 'issueDetails': {
      if (trimmed.length < 3) return {};
      return { issueDetails: trimmed };
    }
    case 'urgency': {
      const urgency = extractUrgency(trimmed);
      if (urgency) return { urgency };
      return {};
    }
    case 'preferredContact': {
      const preferredContact = extractPreferredContact(trimmed);
      if (preferredContact) return { preferredContact };
      return {};
    }
    case 'consentTreatment': {
      if (/\b(s[ií]|acepto|autorizo|de acuerdo|ok)\b/i.test(trimmed)) {
        return { consentTreatment: 'yes' };
      }
      if (/\b(no|niego|rechazo)\b/i.test(trimmed)) {
        return { consentTreatment: 'no' };
      }
      return {};
    }
    default:
      return {};
  }
}

export async function buildPeskidsIntakeTurn(params: {
  senderContact: string;
  senderName?: string;
  source: MessageSource;
  latestMessage: string;
  mode?: PeskidsChatMode;
}): Promise<PeskidsIntakeTurn> {
  const mode = params.mode ?? 'admissions';
  const history = await getConversationMessages(params.senderContact, 16);
  const inboundHistory = history.filter(
    (message) => message.direction === 'inbound' || !message.direction
  );

  let profile: PeskidsIntakeProfile = {};

  if (params.source === 'whatsapp') {
    const fromWa = phoneFromSenderContact(params.senderContact);
    if (fromWa) profile.phone = fromWa;
    // Canal WhatsApp: el contacto ya escribió al número oficial (consentimiento de canal).
    profile.consentTreatment = 'yes';
  }

  const priorInbound = inboundHistory.filter(
    (message) => message.message_text.trim() !== params.latestMessage.trim()
  );

  for (const message of priorInbound) {
    profile = mergeProfile(profile, profileFromText(message.message_text));
  }

  if (!profile.parentName && params.senderName && !isGenericName(params.senderName)) {
    profile.parentName = normalizeName(params.senderName);
  }

  if (profile.specialCondition !== 'yes') {
    profile.specialConditionDetails = undefined;
  }

  if (profile.classModality === 'llanogrande' && !profile.neighborhood) {
    profile.neighborhood = 'Llanogrande';
  }

  const missingBeforeLatest = firstMissingField(profile, mode);

  if (params.latestMessage) {
    profile = mergeProfile(profile, profileFromText(params.latestMessage));
    if (missingBeforeLatest && !profile[missingBeforeLatest]) {
      profile = mergeProfile(profile, applyDirectAnswer(missingBeforeLatest, params.latestMessage));
    }
  }

  const requiredOrder = requiredFieldOrder(profile, mode);
  if (profile.classModality === 'llanogrande' && !profile.neighborhood) {
    profile.neighborhood = 'Llanogrande';
  }
  if (
    (profile.applicantRole === 'teacher_applicant' || profile.applicantRole === 'company') &&
    !profile.classModality
  ) {
    profile.classModality = 'llanogrande';
    profile.neighborhood = profile.neighborhood ?? 'Llanogrande';
    profile.gradeInterested = profile.gradeInterested ?? 'Other';
  }
  const missingField = requiredOrder.find((field) => !fieldIsCaptured(profile, field)) ?? null;
  const capturedFields = requiredOrder.filter((field) => fieldIsCaptured(profile, field)).map(String);
  const stage = missingField ? 'collecting' : 'handoff';
  const progress = formatProgress(capturedFields.length, requiredOrder.length);

  const isFirstTurn = inboundHistory.length <= 1;
  const showWelcome =
    isFirstTurn && (isGreetingOnly(params.latestMessage) || capturedFields.length === 0);
  const questionSpec = missingField ? questionSpecForField(missingField, profile, mode) : null;

  let reply: string;
  if (missingField) {
    const question =
      questionSpec?.prompt ??
      '¿Me compartes un poco más de información para completar tu solicitud?';
    reply = showWelcome
      ? `${mode === 'support' ? peskidsSupportWelcome(params.source) : peskidsIntakeWelcome(params.source)}\n\n${question}`
      : profile.consentTreatment === 'no' && missingField === 'consentTreatment'
        ? 'Entiendo. Sin tu autorización no podemos guardar la solicitud en la plataforma. Si quieres continuar, responde «Sí, autorizo».'
        : question;
  } else {
    reply = mode === 'support' ? supportHandoffReplyToUser(profile) : handoffReplyToUser(profile);
  }

  const supportDraft = missingField
    ? null
    : buildSupportHandoffDraft({
        profile,
        senderName: params.senderName ?? 'Contacto',
        senderContact: params.senderContact,
        source: params.source,
        messageCount: inboundHistory.length,
        mode,
      });

  return {
    stage,
    confidence: progress, // 0-1: same as progress; callers may gate handoff on confidence > 0.75
    progress,
    turnCount: inboundHistory.length,
    reply,
    supportDraft,
    profile,
    missingField,
    capturedFields,
    inputMode: questionSpec?.inputMode ?? 'text',
    quickReplies: questionSpec?.choices ?? null,
  };
}

function supportHandoffReplyToUser(profile: PeskidsIntakeProfile): string {
  const name = profile.parentName ?? 'familia';
  const issue =
    profile.issueType === 'class'
      ? 'clase'
      : profile.issueType === 'schedule'
        ? 'horario'
        : profile.issueType === 'reschedule'
          ? 'reprogramar clase'
          : profile.issueType === 'cancel'
            ? 'cancelar clase'
            : profile.issueType === 'payment'
              ? 'pago'
              : profile.issueType === 'attendance'
                ? 'asistencia'
                : profile.issueType === 'feedback'
                  ? 'feedback'
                  : profile.issueType === 'access'
                    ? 'acceso'
                    : 'otro';
  const urgency =
    profile.urgency === 'today'
      ? 'hoy'
      : profile.urgency === 'this_week'
        ? 'esta semana'
        : profile.urgency === 'when_possible'
          ? 'cuando puedan'
          : '—';

  return (
    `Gracias, ${name}. Ya tengo tu caso de soporte.\n\n` +
    `• Estudiante: ${profile.childName ?? '—'}\n` +
    `• Tipo de soporte: ${issue}\n` +
    `• Detalle: ${profile.issueDetails ?? '—'}\n` +
    `• Urgencia: ${urgency}\n` +
    `• Preferencia de respuesta: ${
      profile.preferredContact === 'whatsapp'
        ? 'WhatsApp'
        : profile.preferredContact === 'phone'
          ? 'Llamada'
          : profile.preferredContact === 'email'
            ? 'Correo'
            : 'Aquí mismo'
    }\n\n` +
    `Un miembro del equipo revisará tu caso y te responderá por el canal elegido.\n` +
    `Si necesitas reprogramar o cancelar clase, el equipo confirmará primero la política aplicable antes de mover nada.`
  );
}
