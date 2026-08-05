'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Loader2, Send } from 'lucide-react'
import { WhatsAppLink } from '@/components/contact/whatsapp-link'
import { buildPostLeadWhatsAppPrefill, writePeskidsLeadSession } from '@/lib/peskids-lead-session'
import { ageYearsFromBirthDate } from '@/lib/lead-age'
import {
  PESKIDS_COMPANY_KINDS,
  PESKIDS_LEAD_TYPES,
  leadApiPostSchema,
  leadCaptureFormSchema,
  type PeskidsCompanyKind,
  type PeskidsLeadType,
} from '@/lib/validation/lead.schema'
import {
  PESKIDS_CONSENT_MARKETING,
  PESKIDS_CONSENT_PHOTOS_VIDEOS,
  PESKIDS_FORM_CARD_DESCRIPTION,
  PESKIDS_FORM_CARD_TITLE,
  PESKIDS_FORM_SUBMIT_LABEL,
  PESKIDS_FORM_SUCCESS_DETAIL,
  PESKIDS_FORM_SUCCESS_TITLE,
  PESKIDS_FORM_SUCCESS_RESPONSE_TIME,
  PESKIDS_RESERVATION_EYEBROW,
  PESKIDS_RESERVATION_TITLE,
} from '@/lib/peskids-landing-copy'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { firstZodErrorMessage } from '@/lib/validation/zod-errors'
import { cn } from '@/lib/utils'

const CONSENT_POLICY_VERSION = 'pk-parental-v1+pk-privacy-v1@1.0'

const COMPANY_KIND_LABELS: Record<PeskidsCompanyKind, string> = {
  guarderia: 'Guardería',
  colegio: 'Colegio',
  empresa: 'Empresa',
  conjunto: 'Conjunto residencial',
  otro: 'Otro',
}

const LEAD_TYPE_LABELS: Record<PeskidsLeadType, string> = {
  family: 'Clientes o alumnos',
  teacher_applicant: 'Trabaja con nosotros',
  company: 'Alianzas con guarderías',
}

type FormState = {
  lead_type: PeskidsLeadType | ''
  name: string
  email: string
  phone: string
  class_modality: '' | 'llanogrande' | 'domicilio'
  neighborhood: string
  city: string
  child_name: string
  birth_date: string
  document_type: string
  document_number: string
  experience: string
  availability: string
  work_zones: string
  observations: string
  attachments: Record<string, string>
  company_name: string
  company_nit: string
  contact_role: string
  company_kind: PeskidsCompanyKind | ''
  location: string
  approx_children: string
  need: string
  referral_source: string
}

type StepId =
  | 'who'
  | 'where'
  | 'zone'
  | 'child'
  | 'guardian'
  | 'teacher_profile'
  | 'teacher_ops'
  | 'company_org'
  | 'company_need'
  | 'contact'
  | 'review'
  | 'consent'

const emptyForm = (referralSource = ''): FormState => ({
  lead_type: '',
  name: '',
  email: '',
  phone: '',
  class_modality: '',
  neighborhood: '',
  city: '',
  child_name: '',
  birth_date: '',
  document_type: 'CC',
  document_number: '',
  experience: '',
  availability: '',
  work_zones: '',
  observations: '',
  attachments: {},
  company_name: '',
  company_nit: '',
  contact_role: '',
  company_kind: '',
  location: '',
  approx_children: '',
  need: '',
  referral_source: referralSource,
})

function stepsForLead(leadType: PeskidsLeadType | '', modality: FormState['class_modality']): StepId[] {
  if (!leadType) return ['who']
  if (leadType === 'family') {
    const base: StepId[] = ['who', 'where']
    if (modality === 'domicilio') base.push('zone')
    return [...base, 'child', 'guardian', 'contact', 'review', 'consent']
  }
  if (leadType === 'teacher_applicant') {
    return ['who', 'teacher_profile', 'teacher_ops', 'contact', 'review', 'consent']
  }
  return ['who', 'company_org', 'company_need', 'contact', 'review', 'consent']
}

function supportPrompt(step: StepId, form: FormState): string {
  switch (step) {
    case 'who':
      return '👋 Hola. Bienvenido a Peskids.\nEn menos de un minuto encontraremos la mejor opción para tu hijo.'
    case 'where':
      return 'Perfecto. ¿Prefieres clases en la sede Llanogrande o a domicilio? Al final te conecto directo con ese WhatsApp.'
    case 'zone':
      return 'Listo, equipo de Domicilios. ¿En qué barrio o zona necesitan las clases?'
    case 'child':
      return 'Cuéntame del alumno o alumna: nombre y fecha de nacimiento.'
    case 'guardian':
      return 'Perfecto. Ahora los datos del acudiente (como en una matrícula).'
    case 'teacher_profile':
      return 'Gracias por tu interés en trabajar con nosotros. Empieza con tu información básica.'
    case 'teacher_ops':
      return 'Perfecto. Ahora cuéntame tu disponibilidad y zonas donde puedes trabajar.'
    case 'company_org':
      return 'Excelente. Cuéntame los datos de tu guardería.'
    case 'company_need':
      return '¿Cuentas con piscina en tus instalaciones? ¿Cuál es tu número de contacto?'
    case 'contact':
      return '¿A qué correo y WhatsApp te escribimos? El teléfono es obligatorio para contactarte rápido.'
    case 'review':
      return 'Perfecto. Verifica que todo esté correcto antes de continuar.'
    case 'consent':
      return form.lead_type === 'company'
        ? 'Último paso: autoriza el tratamiento de datos. Luego continuarás por WhatsApp.'
        : form.class_modality === 'domicilio'
          ? 'Último paso: autorizaciones. Luego te abro WhatsApp de Domicilios.'
          : form.class_modality === 'llanogrande'
            ? 'Último paso: autorizaciones. Luego te abro WhatsApp de Llanogrande.'
            : 'Último paso: autorizaciones. Luego puedes continuar por WhatsApp.'
    default:
      return 'Continuemos.'
  }
}

function successWhatsAppLabel(modality: FormState['class_modality'], leadType?: string): string {
  if (leadType === 'company') return 'Continuar por WhatsApp →'
  if (leadType === 'teacher_applicant') return 'Continuar por WhatsApp →'
  if (modality === 'domicilio') return 'Continuar por WhatsApp Domicilios →'
  if (modality === 'llanogrande') return 'Continuar por WhatsApp Llanogrande →'
  return 'Continuar por WhatsApp →'
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition',
        selected
          ? 'border-pk-primary bg-pk-primary/15 text-pk-ink ring-2 ring-pk-primary/30'
          : 'border-pk-border bg-pk-surface text-pk-ink hover:border-pk-primary/50'
      )}
    >
      {children}
    </button>
  )
}

function SupportBubble({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="mb-4 flex gap-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pk-primary text-xs font-bold text-white shadow-sm"
        aria-hidden
      >
        Pk
      </div>
      <div className="rounded-2xl rounded-tl-md border border-pk-primary/20 bg-pk-bg px-4 py-3 text-sm leading-relaxed text-pk-ink shadow-sm">
        {children}
      </div>
    </div>
  )
}

type LeadCaptureFormProps = {
  source?: string
  campaign?: string
  defaultReferralSource?: string
  embedded?: boolean
}

export function LeadCaptureForm({
  source = 'web',
  campaign,
  defaultReferralSource = '',
  embedded = false,
}: LeadCaptureFormProps): React.ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(12)
  const [stepIndex, setStepIndex] = useState(0)
  const [formData, setFormData] = useState(() => emptyForm(defaultReferralSource))
  const [consentTreatment, setConsentTreatment] = useState(false)
  const [consentMarketing, setConsentMarketing] = useState(false)
  const [consentPhotosVideos, setConsentPhotosVideos] = useState(false)
  const referredByCode = useMemo(
    () => searchParams.get('ref')?.trim().toUpperCase() ?? '',
    [searchParams]
  )

  const steps = useMemo(
    () => stepsForLead(formData.lead_type, formData.class_modality),
    [formData.lead_type, formData.class_modality]
  )
  const step = steps[Math.min(stepIndex, steps.length - 1)] ?? 'who'
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100)

  const childAge = useMemo(
    () => (formData.birth_date ? ageYearsFromBirthDate(formData.birth_date) : null),
    [formData.birth_date]
  )

  useEffect(() => {
    if (!submitted) return
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [submitted])

  useEffect(() => {
    setStepIndex((prev) => Math.min(prev, Math.max(steps.length - 1, 0)))
  }, [steps.length])

  const setField = (name: keyof FormState, value: string): void => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateCurrentStep = (): string | null => {
    switch (step) {
      case 'who':
        return formData.lead_type ? null : 'Elige una opción para continuar'
      case 'where':
        return formData.class_modality ? null : 'Elige sede o domicilio'
      case 'zone':
        return formData.neighborhood.trim().length >= 2
          ? null
          : 'Indica el barrio o zona'
      case 'child':
        if (formData.child_name.trim().length < 2) return 'Nombre del alumno incompleto'
        if (!formData.birth_date) return 'Indica la fecha de nacimiento'
        return null
      case 'guardian':
        if (formData.name.trim().length < 2) return 'Nombre del acudiente incompleto'
        if (formData.document_number.trim().length < 4) return 'Cédula incompleta'
        if (formData.city.trim().length < 2) return 'Ciudad de residencia obligatoria'
        return null
      case 'teacher_profile':
        if (formData.name.trim().length < 2) return 'Nombre incompleto'
        if (formData.document_number.trim().length < 4) return 'Cédula incompleta'
        if (formData.experience.trim().length < 10) return 'Cuéntanos un poco más de tu experiencia'
        return null
      case 'teacher_ops':
        if (formData.availability.trim().length < 3) return 'Indica tu disponibilidad'
        if (formData.work_zones.trim().length < 3) return 'Indica zonas de trabajo'
        return null
      case 'company_org':
        if (formData.company_name.trim().length < 2) return 'Nombre de la institución incompleto'
        if (formData.company_nit.trim().length < 4) return 'NIT incompleto'
        if (formData.name.trim().length < 2) return 'Contacto incompleto'
        if (formData.contact_role.trim().length < 2) return 'Cargo incompleto'
        if (!formData.company_kind) return 'Selecciona el tipo de institución'
        return null
      case 'company_need':
        if (formData.location.trim().length < 2) return 'Ubicación incompleta'
        if (!formData.approx_children || Number(formData.approx_children) < 1) {
          return 'Indica cantidad aproximada de niños'
        }
        if (formData.need.trim().length < 5) return 'Describe la necesidad'
        return null
      case 'contact':
        if (!formData.email.includes('@')) return 'Correo inválido'
        if (formData.phone.trim().length < 7) return 'Teléfono obligatorio (mín. 7 dígitos)'
        return null
      case 'review':
        return null
      case 'consent':
        return consentTreatment ? null : 'Debes autorizar el tratamiento de datos'
      default:
        return null
    }
  }

  const goNext = (): void => {
    setError('')
    const validationError = validateCurrentStep()
    if (validationError) {
      setError(validationError)
      return
    }
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const goBack = (): void => {
    setError('')
    setStepIndex((prev) => Math.max(prev - 1, 0))
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (step !== 'consent') {
      goNext()
      return
    }

    setLoading(true)
    setError('')

    try {
      const referralSource = formData.referral_source || defaultReferralSource || undefined
      const leadType = formData.lead_type || 'family'

      const rawPayload: Record<string, unknown> = {
        lead_type: leadType,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        referral_source: referralSource,
        referred_by_code: referredByCode || undefined,
      }

      if (leadType === 'family') {
        Object.assign(rawPayload, {
          child_name: formData.child_name,
          birth_date: formData.birth_date,
          document_type: formData.document_type || 'CC',
          document_number: formData.document_number,
          city: formData.city || undefined,
          class_modality: formData.class_modality,
          neighborhood:
            formData.class_modality === 'llanogrande' ? undefined : formData.neighborhood,
        })
      } else if (leadType === 'teacher_applicant') {
        Object.assign(rawPayload, {
          document_type: formData.document_type || 'CC',
          document_number: formData.document_number,
          experience: formData.experience,
          availability: formData.availability,
          work_zones: formData.work_zones,
          observations: formData.observations || undefined,
        })
      } else {
        Object.assign(rawPayload, {
          company_name: formData.company_name,
          contact_role: formData.name,
          company_nit: formData.company_nit,
          location: formData.company_name,
          approx_children: 5,
          need: 'Alianza con guardería - consultar disponibilidad',
        })
      }

      const formParsed = leadCaptureFormSchema.safeParse(rawPayload)
      if (!formParsed.success) {
        setError(firstZodErrorMessage(formParsed.error))
        return
      }

      const apiParsed = leadApiPostSchema.safeParse({
        ...rawPayload,
        consent_treatment: consentTreatment ? true : undefined,
        consent_marketing: consentMarketing,
        consent_photos_videos: consentPhotosVideos,
        consent_policy_version: CONSENT_POLICY_VERSION,
        source,
        campaign,
      })
      if (!apiParsed.success) {
        setError(firstZodErrorMessage(apiParsed.error))
        return
      }

      // Para profesores con archivos, usar FormData
      const hasAttachments = leadType === 'teacher_applicant' && Object.keys(formData.attachments).length > 0
      let apiResponse: Response

      if (hasAttachments) {
        const formDataPayload = new FormData()
        // Agregar datos de texto
        Object.entries(apiParsed.data).forEach(([key, value]) => {
          if (value !== undefined && value !== null && typeof value !== 'object') {
            formDataPayload.append(key, String(value))
          }
        })
        // Agregar archivos desde inputs
        document.querySelectorAll('input[type="file"][data-peskids-attachment]').forEach((input: Element) => {
          const fileInput = input as HTMLInputElement
          if (fileInput.files && fileInput.files.length > 0) {
            const attachmentType = fileInput.getAttribute('data-peskids-attachment')
            if (attachmentType) {
              formDataPayload.append(`file_${attachmentType}`, fileInput.files[0])
            }
          }
        })

        apiResponse = await fetch('/api/leads', {
          method: 'POST',
          body: formDataPayload,
        })
      } else {
        apiResponse = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiParsed.data),
        })
      }

      if (!apiResponse.ok) {
        const apiErrorText = await apiResponse.text()
        console.error('Peskids lead API error:', apiResponse.status, apiErrorText)
        throw new Error(`Lead API failed: ${apiResponse.status}`)
      }

      const apiResult = (await apiResponse.json()) as {
        referral_link?: string | null
        referral_code?: string | null
      }

      const webhookUrl =
        process.env.NEXT_PUBLIC_N8N_LEAD_WEBHOOK || 'https://www.peskids.com/webhooks/lead-capture'
      void fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formParsed.data,
          full_name: formParsed.data.name,
          source,
          campaign: campaign ?? null,
        }),
      }).catch((err) => {
        console.warn('Lead webhook mirror failed:', err)
      })

      const modality =
        formData.class_modality === 'llanogrande' || formData.class_modality === 'domicilio'
          ? formData.class_modality
          : null

      writePeskidsLeadSession(formData.name, {
        class_modality: modality,
        lead_type: leadType,
      })
      setSubmitted(true)
      setConsentTreatment(false)
      setConsentMarketing(false)
      setConsentPhotosVideos(false)

      const thanksUrl = new URL('/thanks', window.location.origin)
      if (modality) thanksUrl.searchParams.set('modality', modality)
      window.setTimeout(() => {
        setFormData(emptyForm(defaultReferralSource))
        router.push(`${thanksUrl.pathname}${thanksUrl.search}`)
      }, 12000)
    } catch (err) {
      setError('No pudimos enviar el formulario. Revisa los datos e intenta de nuevo.')
      console.error('Form submission error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      id={embedded ? undefined : 'contacto'}
      accent="teal"
      hover
      className="scroll-mt-28 overflow-hidden border-2 border-pk-primary/40 shadow-[0_20px_50px_rgba(45,183,176,0.22)] ring-2 ring-pk-primary/15"
    >
      {embedded ? (
        <CardHeader className="border-0 bg-gradient-to-br from-pk-primary/10 via-pk-bg to-pk-surface pb-2 pt-6">
          <CardTitle className="text-2xl sm:text-3xl">{PESKIDS_FORM_CARD_TITLE}</CardTitle>
          <CardDescription>{PESKIDS_FORM_CARD_DESCRIPTION}</CardDescription>
        </CardHeader>
      ) : (
        <CardHeader className="border-0 bg-gradient-to-br from-pk-primary/10 via-pk-bg to-pk-surface pb-2">
          <p className="pk-eyebrow text-pk-primary">{PESKIDS_RESERVATION_EYEBROW}</p>
          <CardTitle className="text-2xl sm:text-3xl">{PESKIDS_RESERVATION_TITLE}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={embedded ? 'pt-2' : undefined}>
        {submitted ? (
          <div
            className="rounded-xl border border-pk-primary/30 bg-pk-primary/10 px-4 py-6 text-sm text-pk-ink"
            role="status"
          >
            <div className="space-y-4">
              <div>
                <p className="text-xl font-bold text-pk-ink">{PESKIDS_FORM_SUCCESS_TITLE}</p>
                <p className="mt-2 text-pk-sub">{PESKIDS_FORM_SUCCESS_DETAIL}</p>
              </div>
              <WhatsAppLink
                variant="hero"
                label={successWhatsAppLabel(formData.class_modality, formData.lead_type || undefined)}
                modality={formData.class_modality || null}
                prefill={buildPostLeadWhatsAppPrefill(formData.name, {
                  class_modality: formData.class_modality || null,
                  lead_type: formData.lead_type || null,
                })}
                className="w-full"
              />
              <div className="rounded-lg bg-pk-surface/50 px-3 py-2 text-center text-xs text-pk-sub">
                {PESKIDS_FORM_SUCCESS_RESPONSE_TIME}
              </div>
            </div>
            <p className="mt-6 text-center text-xs text-pk-sub">
              Redirigiendo en {redirectCountdown}s…
            </p>
          </div>
        ) : (
          <form onSubmit={(ev) => void handleSubmit(ev)} className="space-y-4">
            <div className="mb-1">
              <div className="mb-2 flex items-center justify-between text-xs text-pk-sub">
                <span>
                  {steps.length - stepIndex - 1 === 1
                    ? 'Solo falta 1 pregunta'
                    : steps.length - stepIndex - 1 > 1
                      ? `Solo faltan ${steps.length - stepIndex - 1} preguntas`
                      : 'Último paso'}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-pk-border/60">
                <div
                  className="h-full rounded-full bg-pk-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <SupportBubble>{supportPrompt(step, formData)}</SupportBubble>

            {step === 'who' ? (
              <div className="space-y-2">
                {PESKIDS_LEAD_TYPES.map((t) => (
                  <ChoiceButton
                    key={t}
                    selected={formData.lead_type === t}
                    onClick={() => {
                      setField('lead_type', t)
                      setError('')
                      setStepIndex(0)
                    }}
                  >
                    {LEAD_TYPE_LABELS[t]}
                  </ChoiceButton>
                ))}
              </div>
            ) : null}

            {step === 'where' ? (
              <div className="space-y-2">
                <ChoiceButton
                  selected={formData.class_modality === 'llanogrande'}
                  onClick={() => {
                    setField('class_modality', 'llanogrande')
                    setField('neighborhood', '')
                    setError('')
                  }}
                >
                  Sede Llanogrande — te conecto al WhatsApp de la sede
                </ChoiceButton>
                <ChoiceButton
                  selected={formData.class_modality === 'domicilio'}
                  onClick={() => {
                    setField('class_modality', 'domicilio')
                    setError('')
                  }}
                >
                  Domicilio — te conecto al WhatsApp de Domicilios
                </ChoiceButton>
              </div>
            ) : null}

            {step === 'zone' ? (
              <div>
                <Label htmlFor="neighborhood" required>
                  Barrio, zona o dirección
                </Label>
                <input
                  id="neighborhood"
                  className="pk-input"
                  value={formData.neighborhood}
                  onChange={(e) => setField('neighborhood', e.target.value)}
                  required
                  placeholder="Ej. El Poblado, Envigado…"
                  autoFocus
                />
              </div>
            ) : null}

            {step === 'child' ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="child_name" required>
                    Nombre del alumno
                  </Label>
                  <input
                    id="child_name"
                    className="pk-input"
                    value={formData.child_name}
                    onChange={(e) => setField('child_name', e.target.value)}
                    required
                    minLength={2}
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="birth_date" required>
                    Fecha de nacimiento
                  </Label>
                  <input
                    id="birth_date"
                    type="date"
                    className="pk-input"
                    value={formData.birth_date}
                    onChange={(e) => setField('birth_date', e.target.value)}
                    required
                  />
                  {childAge !== null ? (
                    <p className="mt-1 text-xs text-pk-sub">Edad calculada: {childAge} años</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {step === 'guardian' ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name" required>
                    Nombre del acudiente
                  </Label>
                  <input
                    id="name"
                    className="pk-input"
                    value={formData.name}
                    onChange={(e) => setField('name', e.target.value)}
                    required
                    autoComplete="name"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="document_type" required>
                    Tipo de documento
                  </Label>
                  <select
                    id="document_type"
                    className="pk-select"
                    value={formData.document_type}
                    onChange={(e) => setField('document_type', e.target.value)}
                    required
                  >
                    <option value="CC">Cédula de Ciudadanía</option>
                    <option value="TI">Tarjeta de Identidad</option>
                    <option value="CE">Cédula de Extranjería</option>
                    <option value="PA">Pasaporte</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="document_number" required>
                    Número de documento de identidad
                  </Label>
                  <input
                    id="document_number"
                    className="pk-input"
                    value={formData.document_number}
                    onChange={(e) => setField('document_number', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="city" required>
                    Ciudad de residencia
                  </Label>
                  <input
                    id="city"
                    className="pk-input"
                    value={formData.city}
                    onChange={(e) => setField('city', e.target.value)}
                    required
                    placeholder="Ej. Medellín, Bogotá…"
                    autoComplete="address-level2"
                  />
                </div>
              </div>
            ) : null}

            {step === 'teacher_profile' ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name" required>
                    Nombre completo
                  </Label>
                  <input
                    id="name"
                    className="pk-input"
                    value={formData.name}
                    onChange={(e) => setField('name', e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="document_type" required>
                    Tipo de documento
                  </Label>
                  <select
                    id="document_type"
                    className="pk-select"
                    value={formData.document_type}
                    onChange={(e) => setField('document_type', e.target.value)}
                    required
                  >
                    <option value="CC">Cédula de Ciudadanía</option>
                    <option value="TI">Tarjeta de Identidad</option>
                    <option value="CE">Cédula de Extranjería</option>
                    <option value="PA">Pasaporte</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="document_number" required>
                    Número de documento
                  </Label>
                  <input
                    id="document_number"
                    className="pk-input"
                    value={formData.document_number}
                    onChange={(e) => setField('document_number', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="experience" required>
                    Cuéntanos un poco de tu experiencia
                  </Label>
                  <textarea
                    id="experience"
                    className="pk-input min-h-[88px]"
                    value={formData.experience}
                    onChange={(e) => setField('experience', e.target.value)}
                    required
                    placeholder="Años de experiencia, especialidades, certificaciones…"
                  />
                </div>
              </div>
            ) : null}

            {step === 'teacher_ops' ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="availability" required>
                    ¿Cuándo puedes trabajar?
                  </Label>
                  <input
                    id="availability"
                    className="pk-input"
                    value={formData.availability}
                    onChange={(e) => setField('availability', e.target.value)}
                    required
                    placeholder="Mañanas, tardes, fines de semana…"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="work_zones" required>
                    ¿En dónde puedes trabajar?
                  </Label>
                  <input
                    id="work_zones"
                    className="pk-input"
                    value={formData.work_zones}
                    onChange={(e) => setField('work_zones', e.target.value)}
                    required
                    placeholder="Zonas o barrios donde puedes desplazarte…"
                  />
                </div>
                <div>
                  <Label htmlFor="curriculum">
                    Adjuntar hoja de vida con foto
                  </Label>
                  <input
                    id="curriculum"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="pk-input"
                    data-peskids-attachment="curriculum"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setField('attachments', { ...formData.attachments, curriculum: file.name })
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="cedula_copy">
                    Adjuntar copia de la cédula
                  </Label>
                  <input
                    id="cedula_copy"
                    type="file"
                    accept="image/*,.pdf"
                    className="pk-input"
                    data-peskids-attachment="cedula_copy"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setField('attachments', { ...formData.attachments, cedula_copy: file.name })
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="swimming_video">
                    Adjuntar video nadando los 4 estilos
                  </Label>
                  <input
                    id="swimming_video"
                    type="file"
                    accept="video/*"
                    className="pk-input"
                    data-peskids-attachment="swimming_video"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setField('attachments', { ...formData.attachments, swimming_video: file.name })
                      }
                    }}
                  />
                </div>
                <div className="rounded-lg border border-pk-border bg-pk-bg p-3 text-sm text-pk-sub">
                  <p className="font-semibold text-pk-ink">Requisitos:</p>
                  <ul className="mt-2 space-y-1">
                    <li>✓ Curso de Salvamento</li>
                    <li>✓ Tarjeta Profesional</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-pk-primary/20 bg-pk-primary/5 p-3 text-sm text-pk-sub">
                  <p className="font-semibold text-pk-ink">Plus:</p>
                  <ul className="mt-2 space-y-1">
                    <li>✨ ¿Eres o fuiste nadador?</li>
                  </ul>
                </div>
                <div>
                  <Label htmlFor="observations">Observaciones adicionales</Label>
                  <textarea
                    id="observations"
                    className="pk-input min-h-[72px]"
                    value={formData.observations}
                    onChange={(e) => setField('observations', e.target.value)}
                    placeholder="Menciónalo aquí si tienes experiencia en competencias o especializaciones…"
                  />
                </div>
              </div>
            ) : null}

            {step === 'company_org' ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-pk-primary/20 bg-pk-primary/5 p-3 text-sm">
                  <p className="text-pk-ink">
                    Este espacio está destinado para guarderías que cuenten con piscina y quieran que Peskids preste servicio en sus instalaciones a alumnos de 2 a 5 años.
                  </p>
                </div>
                <div>
                  <Label htmlFor="company_name" required>
                    Nombre de la guardería
                  </Label>
                  <input
                    id="company_name"
                    className="pk-input"
                    value={formData.company_name}
                    onChange={(e) => setField('company_name', e.target.value)}
                    required
                    autoFocus
                    placeholder="Ej. Guardería Pequeños Pasos"
                  />
                </div>
                <div>
                  <Label htmlFor="name" required>
                    Nombre de la persona encargada
                  </Label>
                  <input
                    id="name"
                    className="pk-input"
                    value={formData.name}
                    onChange={(e) => setField('name', e.target.value)}
                    required
                    placeholder="Nombre completo"
                  />
                </div>
              </div>
            ) : null}

            {step === 'company_need' ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-pk-border bg-pk-bg p-3 text-sm text-pk-sub">
                  <p className="font-semibold text-pk-ink">¿Cuentas con piscina en tus instalaciones?</p>
                  <p className="mt-1">Peskids presta servicio en guarderías con piscina para niños de 2 a 5 años.</p>
                </div>
                <div>
                  <Label htmlFor="phone" required>
                    Número de contacto
                  </Label>
                  <input
                    id="phone"
                    type="tel"
                    className="pk-input"
                    value={formData.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    required
                    autoFocus
                    placeholder="Ej. 300 123 4567"
                  />
                </div>
              </div>
            ) : null}

            {step === 'contact' ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="email" required>
                    Correo electrónico
                  </Label>
                  <input
                    id="email"
                    type="email"
                    className="pk-input"
                    value={formData.email}
                    onChange={(e) => setField('email', e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="phone" required>
                    Teléfono / WhatsApp
                  </Label>
                  <input
                    id="phone"
                    type="tel"
                    className="pk-input"
                    value={formData.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    required
                    autoComplete="tel"
                    placeholder="Ej. 300 123 4567"
                  />
                </div>
              </div>
            ) : null}

            {step === 'review' ? (
              <div className="space-y-3 rounded-lg border border-pk-primary/20 bg-pk-primary/5 p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-pk-sub">Nombre</span>
                    <span className="font-medium text-pk-ink">✓ {formData.name}</span>
                  </div>
                  {formData.child_name ? (
                    <div className="flex items-center justify-between">
                      <span className="text-pk-sub">Alumno</span>
                      <span className="font-medium text-pk-ink">✓ {formData.child_name}</span>
                    </div>
                  ) : null}
                  {formData.birth_date && childAge ? (
                    <div className="flex items-center justify-between">
                      <span className="text-pk-sub">Edad</span>
                      <span className="font-medium text-pk-ink">✓ {childAge} años</span>
                    </div>
                  ) : null}
                  {formData.class_modality ? (
                    <div className="flex items-center justify-between">
                      <span className="text-pk-sub">Sede</span>
                      <span className="font-medium text-pk-ink">
                        ✓ {formData.class_modality === 'llanogrande' ? 'Llanogrande' : 'Domicilio'}
                      </span>
                    </div>
                  ) : null}
                  {formData.neighborhood ? (
                    <div className="flex items-center justify-between">
                      <span className="text-pk-sub">Barrio</span>
                      <span className="font-medium text-pk-ink">✓ {formData.neighborhood}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-pk-sub">Teléfono</span>
                    <span className="font-medium text-pk-ink">✓ {formData.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-pk-sub">Correo</span>
                    <span className="font-medium text-pk-ink">✓ {formData.email}</span>
                  </div>
                </div>
                <p className="text-xs text-pk-sub">Todo correcto</p>
              </div>
            ) : null}

            {step === 'consent' ? (
              <div className="space-y-3">
                <label className="flex items-start gap-2 text-sm text-pk-ink">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={consentTreatment}
                    onChange={(e) => setConsentTreatment(e.target.checked)}
                    required
                  />
                  <span>
                    Autorizo el tratamiento de datos personales según la política de privacidad de
                    Peskids.
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm text-pk-sub">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={consentMarketing}
                    onChange={(e) => setConsentMarketing(e.target.checked)}
                  />
                  <span>{PESKIDS_CONSENT_MARKETING}</span>
                </label>
                <label className="flex items-start gap-2 text-sm text-pk-sub">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={consentPhotosVideos}
                    onChange={(e) => setConsentPhotosVideos(e.target.checked)}
                  />
                  <span>{PESKIDS_CONSENT_PHOTOS_VIDEOS}</span>
                </label>
              </div>
            ) : null}

            {error ? <p className="text-sm text-red-700">{error}</p> : null}

            <div className="flex gap-2 pt-1">
              {stepIndex > 0 ? (
                <Button type="button" variant="secondary" onClick={goBack} className="shrink-0">
                  <ChevronLeft className="mr-1 h-4 w-4" /> Atrás
                </Button>
              ) : null}
              {step === 'consent' ? (
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" /> {PESKIDS_FORM_SUBMIT_LABEL}
                    </>
                  )}
                </Button>
              ) : (
                <Button type="button" className="w-full" onClick={goNext}>
                  Continuar
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
