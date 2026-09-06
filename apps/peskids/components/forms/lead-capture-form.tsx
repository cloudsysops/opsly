'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { WhatsAppLink } from '@/components/contact/whatsapp-link'
import {
  buildPostLeadWhatsAppPrefill,
  writePeskidsLeadSession,
  type PostLeadWhatsAppPrefillOptions,
} from '@/lib/peskids-lead-session'
import {
  PESKIDS_COMPANY_KINDS,
  PESKIDS_LEAD_TYPES,
  leadApiPostSchema,
  leadCaptureFormSchema,
  type PeskidsCompanyKind,
  type PeskidsLeadType,
} from '@/lib/validation/lead.schema'
import {
  PESKIDS_CONSENT_IDENTITY_DOCUMENT,
  PESKIDS_CONSENT_MARKETING,
  PESKIDS_CONSENT_PHOTOS_VIDEOS,
  PESKIDS_CONSENT_TREATMENT,
  PESKIDS_FORM_CARD_DESCRIPTION,
  PESKIDS_FORM_CARD_TITLE,
  PESKIDS_FORM_SUBMIT_LABEL,
  PESKIDS_FORM_SUCCESS_DETAIL,
  PESKIDS_FORM_SUCCESS_DOMICILIO,
  PESKIDS_FORM_SUCCESS_LLANOGRANDE,
  PESKIDS_FORM_SUCCESS_NEXT,
  PESKIDS_FORM_SUCCESS_TITLE,
  PESKIDS_WHATSAPP_CTA_LABEL,
} from '@/lib/peskids-landing-copy'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { firstZodErrorMessage } from '@/lib/validation/zod-errors'
import { cn } from '@/lib/utils'

const CONSENT_POLICY_VERSION = 'pk-parental-v1+pk-privacy-v1@1.0'

const LEAD_TYPE_LABELS: Record<PeskidsLeadType, string> = {
  family: 'Familia / Alumno',
  teacher_applicant: 'Profesor',
  company: 'Empresa o institución',
}

const COMPANY_KIND_LABELS: Record<PeskidsCompanyKind, string> = {
  guarderia: 'Guardería',
  colegio: 'Colegio',
  empresa: 'Empresa',
  conjunto: 'Conjunto residencial',
  otro: 'Otro',
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

type LeadCaptureFormProps = {
  source?: string
  campaign?: string
  defaultReferralSource?: string
  embedded?: boolean
}

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

export function LeadCaptureForm({
  source = 'web',
  campaign,
  defaultReferralSource = '',
  embedded = false,
}: LeadCaptureFormProps): React.ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [submittedLeadId, setSubmittedLeadId] = useState<string | null>(null)
  const [submittedPrefill, setSubmittedPrefill] = useState<PostLeadWhatsAppPrefillOptions | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState(() => emptyForm(defaultReferralSource))
  const [consentTreatment, setConsentTreatment] = useState(false)
  const [consentIdentityDocument, setConsentIdentityDocument] = useState(false)
  const [consentMarketing, setConsentMarketing] = useState(false)
  const [consentPhotosVideos, setConsentPhotosVideos] = useState(false)

  const referredByCode = useMemo(
    () => searchParams.get('ref')?.trim().toUpperCase() ?? '',
    [searchParams]
  )

  const setField = (name: keyof FormState, value: string): void => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = (): string | null => {
    if (!formData.lead_type) return 'Selecciona qué tipo de información necesitas'
    if (!formData.email.includes('@')) return 'Correo válido requerido'
    if (formData.phone.trim().length < 7) return 'Teléfono requerido (mín. 7 dígitos)'
    if (formData.name.trim().length < 2) return 'Nombre requerido'
    if (
      (formData.lead_type === 'family' || formData.lead_type === 'teacher_applicant') &&
      !consentIdentityDocument
    ) {
      return 'Autoriza expresamente el tratamiento de la cédula para continuar'
    }

    if (formData.lead_type === 'family') {
      if (!formData.class_modality) return 'Selecciona sede o domicilio'
      if (!formData.child_name.trim()) return 'Nombre del alumno requerido'
      if (!formData.birth_date) return 'Fecha de nacimiento del alumno requerida'
      if (formData.document_number.trim().length < 4) return 'Cédula del acudiente requerida'
      // Sede Llanogrande: no pedir ciudad ni barrio (barrio se fija en schema).
      // Domicilio: ciudad + barrio obligatorios.
      if (formData.class_modality === 'domicilio') {
        if (!formData.city.trim()) return 'Ciudad requerida para domicilios'
        if (!formData.neighborhood.trim()) return 'Barrio requerido para domicilios'
      }
    } else if (formData.lead_type === 'teacher_applicant') {
      if (formData.document_number.trim().length < 4) return 'Cédula requerida'
      if (formData.experience.trim().length < 10) return 'Describe tu experiencia en natación'
      if (!formData.availability.trim()) return 'Indica tu disponibilidad'
      if (!formData.work_zones.trim()) return 'Indica zonas donde puedes trabajar'
      const cvInput = document.getElementById('teacher_cv') as HTMLInputElement | null
      if (!cvInput?.files || cvInput.files.length === 0) {
        return 'Adjunta tu hoja de vida (PDF o DOC)'
      }
      const videoInput = document.getElementById('teacher_swim_video') as HTMLInputElement | null
      if (!videoInput?.files || videoInput.files.length === 0) {
        return 'Adjunta un video nadando los 4 estilos de natación'
      }
    } else if (formData.lead_type === 'company') {
      if (!formData.company_name.trim()) return 'Nombre de la institución requerido'
      if (formData.company_nit.trim().length < 4) return 'NIT requerido'
      if (!formData.company_kind) return 'Tipo de institución requerido'
      if (!formData.location.trim()) return 'Ubicación requerida'
      if (!formData.approx_children) return 'Aproximado de niños requerido'
      if (formData.need.trim().length < 5) return 'Describe tu necesidad'
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError('')

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

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
          document_number: formData.document_number || undefined,
          city:
            formData.class_modality === 'domicilio' ? formData.city || undefined : undefined,
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
          contact_role: formData.contact_role || formData.name,
          company_nit: formData.company_nit,
          location: formData.location,
          approx_children: formData.approx_children ? parseInt(formData.approx_children, 10) : 5,
          need: formData.need,
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
        consent_identity_document: consentIdentityDocument,
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

      const teacherFileInputs =
        leadType === 'teacher_applicant'
          ? Array.from(
              document.querySelectorAll<HTMLInputElement>(
                'input[type="file"][data-peskids-attachment]'
              )
            ).filter((input) => input.files && input.files.length > 0)
          : []
      const hasAttachments = teacherFileInputs.length > 0
      let apiResponse: Response

      if (hasAttachments) {
        const formDataPayload = new FormData()
        Object.entries(apiParsed.data).forEach(([key, value]) => {
          if (value !== undefined && value !== null && typeof value !== 'object') {
            formDataPayload.append(key, String(value))
          }
        })
        for (const fileInput of teacherFileInputs) {
          const attachmentType = fileInput.getAttribute('data-peskids-attachment')
          const file = fileInput.files?.[0]
          if (attachmentType && file) {
            formDataPayload.append(`file_${attachmentType}`, file)
          }
        }

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

      const apiBody = (await apiResponse.json()) as {
        ok?: boolean
        data?: { lead_id?: string }
        lead_id?: string
        id?: string
      }
      const leadId = (apiBody.data?.lead_id ?? apiBody.lead_id ?? apiBody.id)?.trim() || ''

      void fetch(
        process.env.NEXT_PUBLIC_N8N_LEAD_WEBHOOK || 'https://www.peskids.com/webhooks/lead-capture',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formParsed.data,
            full_name: formParsed.data.name,
            lead_id: leadId || undefined,
            source,
            campaign: campaign ?? null,
          }),
        }
      ).catch((err) => {
        console.warn('Lead webhook mirror failed:', err)
      })

      const modality =
        formData.class_modality === 'llanogrande' || formData.class_modality === 'domicilio'
          ? formData.class_modality
          : null

      const parsedFamily = formParsed.data as {
        child_name?: string
        neighborhood?: string
        company_name?: string
      }

      const waPrefillOptions = {
        class_modality: modality,
        lead_type: leadType,
        lead_id: leadId || null,
        email: formParsed.data.email,
        phone: formParsed.data.phone,
        child_name: parsedFamily.child_name ?? null,
        birth_date: leadType === 'family' ? formData.birth_date : null,
        document_number: leadType === 'family' ? formData.document_number : null,
        neighborhood: parsedFamily.neighborhood ?? null,
        company_name: parsedFamily.company_name ?? null,
        company_nit: leadType === 'company' ? formData.company_nit || null : null,
        contact_role: leadType === 'company' ? formData.contact_role || formData.name : null,
        need: leadType === 'company' ? formData.need || null : null,
        experience: leadType === 'teacher_applicant' ? formData.experience || null : null,
        availability: leadType === 'teacher_applicant' ? formData.availability || null : null,
        work_zones: leadType === 'teacher_applicant' ? formData.work_zones || null : null,
      }

      writePeskidsLeadSession(formData.name, waPrefillOptions)
      setSubmittedLeadId(leadId || null)
      setSubmittedPrefill(waPrefillOptions)
      setSubmitted(true)

      const thanksUrl = new URL('/thanks', window.location.origin)
      if (leadId) thanksUrl.searchParams.set('lead_id', leadId)
      if (modality) thanksUrl.searchParams.set('modality', modality)
      window.setTimeout(() => {
        setFormData(emptyForm(defaultReferralSource))
        router.push(`${thanksUrl.pathname}${thanksUrl.search}`)
      }, 3000)
    } catch (err) {
      console.error('Form submission error:', err)
      setError('Error al procesar tu solicitud. Por favor intenta de nuevo.')
      setLoading(false)
    }
  }

  if (submitted) {
    const modality = formData.class_modality
    const isLlanogrande = modality === 'llanogrande'
    const isDomicilio = modality === 'domicilio'
    const modalityLabel = isLlanogrande ? 'Llanogrande' : isDomicilio ? 'Domicilios' : null
    const successDetail = isLlanogrande
      ? PESKIDS_FORM_SUCCESS_LLANOGRANDE
      : isDomicilio
        ? PESKIDS_FORM_SUCCESS_DOMICILIO
        : PESKIDS_FORM_SUCCESS_DETAIL

    return (
      <div className="flex min-h-screen items-center justify-center bg-pk-snow p-4">
        <Card className="w-full max-w-md border-pk-border/50 shadow-card">
          <CardHeader className="bg-pk-bg">
            <CardTitle className="text-2xl text-pk-ink">{PESKIDS_FORM_SUCCESS_TITLE}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <p className="text-sm text-pk-ink">{successDetail}</p>
            <WhatsAppLink
              modality={isLlanogrande || isDomicilio ? modality : undefined}
              prefill={buildPostLeadWhatsAppPrefill(formData.name, {
                ...(submittedPrefill ?? {}),
                class_modality: isLlanogrande || isDomicilio ? modality : undefined,
                lead_type: formData.lead_type as PeskidsLeadType,
                lead_id: submittedLeadId ?? submittedPrefill?.lead_id,
              })}
              label={
                modalityLabel
                  ? `${PESKIDS_WHATSAPP_CTA_LABEL} — ${modalityLabel}`
                  : PESKIDS_WHATSAPP_CTA_LABEL
              }
              variant="button"
              showIcon
              className="w-full"
            />
            <div className="border-t border-pk-border/30 pt-4">
              <h3 className="font-medium text-pk-ink mb-2">¿Qué sigue?</h3>
              <p className="text-xs text-pk-mutedText">{PESKIDS_FORM_SUCCESS_NEXT}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn('w-full', embedded ? '' : 'min-h-screen bg-pk-snow py-12')}>
      <div className={cn('mx-auto', embedded ? 'max-w-full' : 'max-w-2xl px-4')}>
        <Card className="border-pk-border/50 shadow-card">
          <CardHeader className="bg-pk-bg">
            <CardTitle className="text-xl text-pk-ink">{PESKIDS_FORM_CARD_TITLE}</CardTitle>
            <CardDescription className="text-pk-mutedText">{PESKIDS_FORM_CARD_DESCRIPTION}</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
              {/* Lead Type Selection */}
              <div>
                <Label className="mb-3 block text-sm font-medium text-pk-ink">
                  ¿Para quién estás solicitando información? *
                </Label>
                <div className="space-y-2">
                  {PESKIDS_LEAD_TYPES.map((type) => (
                    <label key={type} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="lead_type"
                        value={type}
                        checked={formData.lead_type === type}
                        onChange={(e) => setField('lead_type', e.target.value)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-pk-ink">{LEAD_TYPE_LABELS[type]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Family-specific fields */}
              {formData.lead_type === 'family' && (
                <>
                  {/* Class Modality */}
                  <div>
                    <Label className="mb-3 block text-sm font-medium text-pk-ink">
                      ¿Prefieres Llanogrande o domicilio? *
                    </Label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="class_modality"
                          value="llanogrande"
                          checked={formData.class_modality === 'llanogrande'}
                          onChange={(e) => {
                            setFormData((prev) => ({
                              ...prev,
                              class_modality: e.target.value as FormState['class_modality'],
                              city: '',
                              neighborhood: '',
                            }))
                          }}
                          className="h-4 w-4"
                        />
                        <span className="text-sm text-pk-ink">Sede Llanogrande</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="class_modality"
                          value="domicilio"
                          checked={formData.class_modality === 'domicilio'}
                          onChange={(e) =>
                            setField('class_modality', e.target.value)
                          }
                          className="h-4 w-4"
                        />
                        <span className="text-sm text-pk-ink">Clases a domicilio</span>
                      </label>
                    </div>
                  </div>

                  {/* Child Info */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="child_name" className="text-sm font-medium text-pk-ink">
                        Nombre del alumno *
                      </Label>
                      <input
                        id="child_name"
                        type="text"
                        value={formData.child_name}
                        onChange={(e) => setField('child_name', e.target.value)}
                        className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink placeholder-pk-mutedText focus:border-pk-primary focus:outline-none"
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div>
                      <Label htmlFor="birth_date" className="text-sm font-medium text-pk-ink">
                        Fecha de nacimiento *
                      </Label>
                      <input
                        id="birth_date"
                        type="date"
                        value={formData.birth_date}
                        onChange={(e) => setField('birth_date', e.target.value)}
                        required
                        autoComplete="bday"
                        className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink focus:border-pk-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Guardian Info */}
                  <div>
                    <h3 className="mb-4 font-medium text-pk-ink">Datos del acudiente</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="guardian_name" className="text-sm font-medium text-pk-ink">
                          Nombre completo *
                        </Label>
                        <input
                          id="guardian_name"
                          type="text"
                          value={formData.name}
                          onChange={(e) => setField('name', e.target.value)}
                          className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink placeholder-pk-mutedText focus:border-pk-primary focus:outline-none"
                          placeholder="Nombre"
                        />
                      </div>
                      <div>
                        <Label htmlFor="document_number" className="text-sm font-medium text-pk-ink">
                          Cédula del acudiente *
                        </Label>
                        <input
                          id="document_number"
                          type="text"
                          value={formData.document_number}
                          onChange={(e) => setField('document_number', e.target.value)}
                          required
                          autoComplete="off"
                          className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink placeholder-pk-mutedText focus:border-pk-primary focus:outline-none"
                          placeholder="Cédula"
                        />
                      </div>
                      {formData.class_modality === 'domicilio' ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label htmlFor="city" className="text-sm font-medium text-pk-ink">
                              Ciudad *
                            </Label>
                            <input
                              id="city"
                              type="text"
                              value={formData.city}
                              onChange={(e) => setField('city', e.target.value)}
                              className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink placeholder-pk-mutedText focus:border-pk-primary focus:outline-none"
                              placeholder="Ciudad"
                              autoComplete="address-level2"
                            />
                          </div>
                          <div>
                            <Label htmlFor="neighborhood" className="text-sm font-medium text-pk-ink">
                              Barrio o zona *
                            </Label>
                            <input
                              id="neighborhood"
                              type="text"
                              value={formData.neighborhood}
                              onChange={(e) => setField('neighborhood', e.target.value)}
                              className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink placeholder-pk-mutedText focus:border-pk-primary focus:outline-none"
                              placeholder="Barrio o zona"
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </>
              )}

              {/* Teacher fields */}
              {formData.lead_type === 'teacher_applicant' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="teacher_name" className="text-sm font-medium text-pk-ink">
                      Nombre completo *
                    </Label>
                    <input
                      id="teacher_name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setField('name', e.target.value)}
                      className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink placeholder-pk-mutedText focus:border-pk-primary focus:outline-none"
                      placeholder="Nombre"
                    />
                  </div>
                  <div>
                    <Label htmlFor="teacher_doc" className="text-sm font-medium text-pk-ink">
                      Cédula *
                    </Label>
                    <input
                      id="teacher_doc"
                      type="text"
                      value={formData.document_number}
                      onChange={(e) => setField('document_number', e.target.value)}
                      className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink placeholder-pk-mutedText focus:border-pk-primary focus:outline-none"
                      placeholder="Cédula"
                    />
                  </div>
                  <div>
                    <Label htmlFor="experience" className="text-sm font-medium text-pk-ink">
                      Experiencia en natación *
                    </Label>
                    <textarea
                      id="experience"
                      value={formData.experience}
                      onChange={(e) => setField('experience', e.target.value)}
                      className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink placeholder-pk-mutedText focus:border-pk-primary focus:outline-none"
                      placeholder="Cuéntanos tu experiencia"
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="availability" className="text-sm font-medium text-pk-ink">
                        Disponibilidad *
                      </Label>
                      <input
                        id="availability"
                        type="text"
                        value={formData.availability}
                        onChange={(e) => setField('availability', e.target.value)}
                        className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink placeholder-pk-mutedText focus:border-pk-primary focus:outline-none"
                        placeholder="Ej: L-V 5-7pm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="work_zones" className="text-sm font-medium text-pk-ink">
                        Zonas de trabajo *
                      </Label>
                      <input
                        id="work_zones"
                        type="text"
                        value={formData.work_zones}
                        onChange={(e) => setField('work_zones', e.target.value)}
                        className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink placeholder-pk-mutedText focus:border-pk-primary focus:outline-none"
                        placeholder="Zonas donde puedes trabajar"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="observations" className="text-sm font-medium text-pk-ink">
                      Observaciones
                    </Label>
                    <textarea
                      id="observations"
                      value={formData.observations}
                      onChange={(e) => setField('observations', e.target.value)}
                      className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink placeholder-pk-mutedText focus:border-pk-primary focus:outline-none"
                      placeholder="Información adicional (opcional)"
                      rows={2}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="teacher_cv" className="text-sm font-medium text-pk-ink">
                        Hoja de vida (PDF o DOC) *
                      </Label>
                      <input
                        id="teacher_cv"
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf"
                        data-peskids-attachment="curriculum"
                        required
                        className="mt-2 block w-full text-sm text-pk-ink file:mr-3 file:rounded-pk file:border-0 file:bg-pk-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-pk-primary"
                      />
                    </div>
                    <div>
                      <Label htmlFor="teacher_swim_video" className="text-sm font-medium text-pk-ink">
                        Video nadando los 4 estilos (MP4 o similar) *
                      </Label>
                      <input
                        id="teacher_swim_video"
                        type="file"
                        accept="video/*,.mp4,.mov,.webm"
                        data-peskids-attachment="swimming_video"
                        required
                        className="mt-2 block w-full text-sm text-pk-ink file:mr-3 file:rounded-pk file:border-0 file:bg-pk-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-pk-primary"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-pk-mutedText">
                    Adjunta tu hoja de vida y un video nadando los 4 estilos de natación (libre,
                    espalda, pecho y mariposa).
                  </p>
                </div>
              )}

              {/* Company fields */}
              {formData.lead_type === 'company' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="company_name" className="text-sm font-medium text-pk-ink">
                      Nombre de la institución *
                    </Label>
                    <input
                      id="company_name"
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setField('company_name', e.target.value)}
                      className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink placeholder-pk-mutedText focus:border-pk-primary focus:outline-none"
                      placeholder="Nombre"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="company_nit" className="text-sm font-medium text-pk-ink">
                        NIT *
                      </Label>
                      <input
                        id="company_nit"
                        type="text"
                        value={formData.company_nit}
                        onChange={(e) => setField('company_nit', e.target.value)}
                        className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink placeholder-pk-mutedText focus:border-pk-primary focus:outline-none"
                        placeholder="NIT"
                      />
                    </div>
                    <div>
                      <Label htmlFor="company_kind" className="text-sm font-medium text-pk-ink">
                        Tipo de institución *
                      </Label>
                      <select
                        id="company_kind"
                        value={formData.company_kind}
                        onChange={(e) => setField('company_kind', e.target.value)}
                        className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink focus:border-pk-primary focus:outline-none"
                      >
                        <option value="">Selecciona...</option>
                        {PESKIDS_COMPANY_KINDS.map((kind) => (
                          <option key={kind} value={kind}>
                            {COMPANY_KIND_LABELS[kind]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="company_contact_name" className="text-sm font-medium text-pk-ink">
                        Nombre de contacto *
                      </Label>
                      <input
                        id="company_contact_name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setField('name', e.target.value)}
                        className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink placeholder-pk-mutedText focus:border-pk-primary focus:outline-none"
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_role" className="text-sm font-medium text-pk-ink">
                        Tu cargo
                      </Label>
                      <input
                        id="contact_role"
                        type="text"
                        value={formData.contact_role}
                        onChange={(e) => setField('contact_role', e.target.value)}
                        className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink placeholder-pk-mutedText focus:border-pk-primary focus:outline-none"
                        placeholder="Director, Coordinador, etc."
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="location" className="text-sm font-medium text-pk-ink">
                        Ubicación *
                      </Label>
                      <input
                        id="location"
                        type="text"
                        value={formData.location}
                        onChange={(e) => setField('location', e.target.value)}
                        className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink placeholder-pk-mutedText focus:border-pk-primary focus:outline-none"
                        placeholder="Ubicación"
                      />
                    </div>
                    <div>
                      <Label htmlFor="approx_children" className="text-sm font-medium text-pk-ink">
                        Aprox. de niños *
                      </Label>
                      <input
                        id="approx_children"
                        type="number"
                        min="1"
                        value={formData.approx_children}
                        onChange={(e) => setField('approx_children', e.target.value)}
                        className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink placeholder-pk-mutedText focus:border-pk-primary focus:outline-none"
                        placeholder="20"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="need" className="text-sm font-medium text-pk-ink">
                      ¿Qué necesitas? *
                    </Label>
                    <textarea
                      id="need"
                      value={formData.need}
                      onChange={(e) => setField('need', e.target.value)}
                      className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink placeholder-pk-mutedText focus:border-pk-primary focus:outline-none"
                      placeholder="Cuéntanos tu necesidad"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Contact info - shown for all */}
              <div className="border-t border-pk-border/30 pt-6">
                <h3 className="mb-4 font-medium text-pk-ink">Datos de contacto</h3>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium text-pk-ink">
                        Correo electrónico *
                      </Label>
                      <input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setField('email', e.target.value)}
                        className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink placeholder-pk-mutedText focus:border-pk-primary focus:outline-none"
                        placeholder="tu@correo.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-sm font-medium text-pk-ink">
                        Teléfono *
                      </Label>
                      <input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setField('phone', e.target.value)}
                        className="mt-2 w-full rounded-pk border border-pk-border bg-pk-surface px-3 py-2 text-sm text-pk-ink placeholder-pk-mutedText focus:border-pk-primary focus:outline-none"
                        placeholder="Teléfono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Consent */}
              <div className="border-t border-pk-border/30 pt-6 space-y-4">
                <label className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={consentTreatment}
                    onChange={(e) => setConsentTreatment(e.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span className="text-xs text-pk-mutedText">{PESKIDS_CONSENT_TREATMENT}</span>
                </label>
                {formData.lead_type === 'family' || formData.lead_type === 'teacher_applicant' ? (
                  <label htmlFor="consent_identity_document" className="flex gap-3">
                    <input
                      id="consent_identity_document"
                      type="checkbox"
                      checked={consentIdentityDocument}
                      onChange={(e) => setConsentIdentityDocument(e.target.checked)}
                      required
                      className="mt-1 h-4 w-4"
                    />
                    <span className="text-xs text-pk-mutedText">
                      {PESKIDS_CONSENT_IDENTITY_DOCUMENT}{' '}
                      <a
                        href="/privacy"
                        className="font-semibold text-pk-primary underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Ver Política de Privacidad.
                      </a>
                    </span>
                  </label>
                ) : null}
                <label className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={consentMarketing}
                    onChange={(e) => setConsentMarketing(e.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span className="text-xs text-pk-mutedText">{PESKIDS_CONSENT_MARKETING}</span>
                </label>
                <label className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={consentPhotosVideos}
                    onChange={(e) => setConsentPhotosVideos(e.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span className="text-xs text-pk-mutedText">{PESKIDS_CONSENT_PHOTOS_VIDEOS}</span>
                </label>
              </div>

              {error && (
                <div className="rounded-pk border border-red-200/50 bg-red-50/20 p-3 text-sm text-red-700/80">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={
                  loading ||
                  !consentTreatment ||
                  ((formData.lead_type === 'family' || formData.lead_type === 'teacher_applicant') &&
                    !consentIdentityDocument)
                }
                className="w-full bg-pk-primary text-white hover:opacity-90"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  PESKIDS_FORM_SUBMIT_LABEL
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
