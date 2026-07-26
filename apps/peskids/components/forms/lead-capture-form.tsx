'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Send } from 'lucide-react'
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
  PESKIDS_FORM_CARD_DESCRIPTION,
  PESKIDS_FORM_CARD_TITLE,
  PESKIDS_FORM_SUBMIT_LABEL,
  PESKIDS_FORM_SUCCESS_DETAIL,
  PESKIDS_RESERVATION_EYEBROW,
  PESKIDS_RESERVATION_TITLE,
  PESKIDS_WHATSAPP_CTA_LABEL,
} from '@/lib/peskids-landing-copy'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { firstZodErrorMessage } from '@/lib/validation/zod-errors'

const CONSENT_POLICY_VERSION = 'pk-parental-v1+pk-privacy-v1@1.0'

const COMPANY_KIND_LABELS: Record<PeskidsCompanyKind, string> = {
  guarderia: 'Guardería',
  colegio: 'Colegio',
  empresa: 'Empresa',
  conjunto: 'Conjunto residencial',
  otro: 'Otro',
}

const LEAD_TYPE_LABELS: Record<PeskidsLeadType, string> = {
  family: 'Familia',
  teacher_applicant: 'Profesor(a)',
  company: 'Empresa / institución',
}

type FormState = {
  lead_type: PeskidsLeadType | ''
  name: string
  email: string
  phone: string
  class_modality: '' | 'llanogrande' | 'domicilio'
  neighborhood: string
  child_name: string
  birth_date: string
  document_type: string
  document_number: string
  experience: string
  availability: string
  work_zones: string
  observations: string
  company_name: string
  company_nit: string
  contact_role: string
  company_kind: PeskidsCompanyKind | ''
  location: string
  approx_children: string
  need: string
  referral_source: string
}

const emptyForm = (referralSource = ''): FormState => ({
  lead_type: '',
  name: '',
  email: '',
  phone: '',
  class_modality: '',
  neighborhood: '',
  child_name: '',
  birth_date: '',
  document_type: 'CC',
  document_number: '',
  experience: '',
  availability: '',
  work_zones: '',
  observations: '',
  company_name: '',
  company_nit: '',
  contact_role: '',
  company_kind: '',
  location: '',
  approx_children: '',
  need: '',
  referral_source: referralSource,
})

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
  const [redirectCountdown, setRedirectCountdown] = useState(5)
  const [formData, setFormData] = useState(() => emptyForm(defaultReferralSource))
  const [consentTreatment, setConsentTreatment] = useState(false)
  const [consentMarketing, setConsentMarketing] = useState(false)
  const referredByCode = useMemo(
    () => searchParams.get('ref')?.trim().toUpperCase() ?? '',
    [searchParams]
  )

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

  const setField = (name: keyof FormState, value: string): void => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
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
          company_nit: formData.company_nit,
          contact_role: formData.contact_role,
          company_kind: formData.company_kind,
          location: formData.location,
          approx_children: formData.approx_children,
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
        consent_marketing: consentMarketing,
        consent_policy_version: CONSENT_POLICY_VERSION,
        source,
        campaign,
      })
      if (!apiParsed.success) {
        setError(firstZodErrorMessage(apiParsed.error))
        return
      }

      const apiResponse = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiParsed.data),
      })

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

      writePeskidsLeadSession(formData.name)
      setSubmitted(true)
      setConsentTreatment(false)
      setConsentMarketing(false)

      const thanksUrl = new URL('/thanks', window.location.origin)
      if (apiResult.referral_link) thanksUrl.searchParams.set('referral_link', apiResult.referral_link)
      if (apiResult.referral_code) thanksUrl.searchParams.set('referral_code', apiResult.referral_code)
      window.setTimeout(() => {
        setFormData(emptyForm(defaultReferralSource))
        router.push(`${thanksUrl.pathname}${thanksUrl.search}`)
      }, 5000)
    } catch (err) {
      setError('No pudimos enviar el formulario. Revisa los datos e intenta de nuevo.')
      console.error('Form submission error:', err)
    } finally {
      setLoading(false)
    }
  }

  const showFamily = formData.lead_type === 'family'
  const showTeacher = formData.lead_type === 'teacher_applicant'
  const showCompany = formData.lead_type === 'company'
  const showDomicilioZone = showFamily && formData.class_modality === 'domicilio'

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
          <CardDescription>{PESKIDS_FORM_CARD_DESCRIPTION}</CardDescription>
          {referredByCode ? (
            <p className="mt-3 rounded-xl border border-pk-primary/20 bg-pk-primary/10 px-3 py-2 text-xs font-medium text-pk-primary">
              Código de recomendación activo: <span className="font-mono">{referredByCode}</span>
            </p>
          ) : null}
        </CardHeader>
      )}
      <CardContent className={embedded ? 'pt-2' : undefined}>
        {submitted ? (
          <div
            className="rounded-xl border border-pk-primary/30 bg-pk-primary/10 px-4 py-4 text-sm text-pk-ink"
            role="status"
          >
            <p className="font-semibold text-pk-primary">
              ¡Perfecto, {formData.name}! Recibimos tu solicitud.
            </p>
            <p className="mt-2 text-pk-sub">{PESKIDS_FORM_SUCCESS_DETAIL}</p>
            <WhatsAppLink
              variant="button"
              label={`${PESKIDS_WHATSAPP_CTA_LABEL} →`}
              prefill={buildPostLeadWhatsAppPrefill(formData.name)}
              className="mt-3 w-full sm:w-auto"
            />
            <p className="mt-4 text-center text-xs text-pk-sub">
              Redirigiendo en {redirectCountdown}s…
            </p>
          </div>
        ) : (
          <form onSubmit={(ev) => void handleSubmit(ev)} className="space-y-4">
            <div>
              <Label htmlFor="lead_type" required>
                ¿Para quién es la solicitud?
              </Label>
              <select
                id="lead_type"
                className="pk-select"
                value={formData.lead_type}
                required
                onChange={(e) => setField('lead_type', e.target.value)}
              >
                <option value="">Selecciona una opción</option>
                {PESKIDS_LEAD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {LEAD_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            {showFamily ? (
              <>
                <div>
                  <Label htmlFor="class_modality" required>
                    ¿Dónde quieres el servicio?
                  </Label>
                  <select
                    id="class_modality"
                    className="pk-select"
                    value={formData.class_modality}
                    required
                    onChange={(e) => setField('class_modality', e.target.value)}
                  >
                    <option value="">Selecciona</option>
                    <option value="llanogrande">Sede Llanogrande</option>
                    <option value="domicilio">Domicilio</option>
                  </select>
                </div>
                {showDomicilioZone ? (
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
                    />
                  </div>
                ) : null}
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
                  />
                </div>
                <div>
                  <Label htmlFor="birth_date" required>
                    Fecha de nacimiento del alumno
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
                  />
                </div>
                <div>
                  <Label htmlFor="document_number" required>
                    Cédula del acudiente
                  </Label>
                  <input
                    id="document_number"
                    className="pk-input"
                    value={formData.document_number}
                    onChange={(e) => setField('document_number', e.target.value)}
                    required
                  />
                </div>
              </>
            ) : null}

            {showTeacher ? (
              <>
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
                  />
                </div>
                <div>
                  <Label htmlFor="document_number" required>
                    Cédula
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
                    Experiencia
                  </Label>
                  <textarea
                    id="experience"
                    className="pk-input min-h-[88px]"
                    value={formData.experience}
                    onChange={(e) => setField('experience', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="availability" required>
                    Disponibilidad
                  </Label>
                  <input
                    id="availability"
                    className="pk-input"
                    value={formData.availability}
                    onChange={(e) => setField('availability', e.target.value)}
                    required
                    placeholder="Mañanas, fines de semana…"
                  />
                </div>
                <div>
                  <Label htmlFor="work_zones" required>
                    Zonas donde puedes trabajar
                  </Label>
                  <input
                    id="work_zones"
                    className="pk-input"
                    value={formData.work_zones}
                    onChange={(e) => setField('work_zones', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="observations">Observaciones</Label>
                  <textarea
                    id="observations"
                    className="pk-input min-h-[72px]"
                    value={formData.observations}
                    onChange={(e) => setField('observations', e.target.value)}
                  />
                </div>
              </>
            ) : null}

            {showCompany ? (
              <>
                <div>
                  <Label htmlFor="company_name" required>
                    Nombre empresa / institución
                  </Label>
                  <input
                    id="company_name"
                    className="pk-input"
                    value={formData.company_name}
                    onChange={(e) => setField('company_name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="company_nit" required>
                    NIT
                  </Label>
                  <input
                    id="company_nit"
                    className="pk-input"
                    value={formData.company_nit}
                    onChange={(e) => setField('company_nit', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name" required>
                    Contacto responsable
                  </Label>
                  <input
                    id="name"
                    className="pk-input"
                    value={formData.name}
                    onChange={(e) => setField('name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact_role" required>
                    Cargo
                  </Label>
                  <input
                    id="contact_role"
                    className="pk-input"
                    value={formData.contact_role}
                    onChange={(e) => setField('contact_role', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="company_kind" required>
                    Tipo
                  </Label>
                  <select
                    id="company_kind"
                    className="pk-select"
                    value={formData.company_kind}
                    required
                    onChange={(e) => setField('company_kind', e.target.value)}
                  >
                    <option value="">Selecciona</option>
                    {PESKIDS_COMPANY_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {COMPANY_KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="location" required>
                    Ubicación
                  </Label>
                  <input
                    id="location"
                    className="pk-input"
                    value={formData.location}
                    onChange={(e) => setField('location', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="approx_children" required>
                    Cantidad aproximada de niños
                  </Label>
                  <input
                    id="approx_children"
                    type="number"
                    min={1}
                    className="pk-input"
                    value={formData.approx_children}
                    onChange={(e) => setField('approx_children', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="need" required>
                    Necesidad
                  </Label>
                  <textarea
                    id="need"
                    className="pk-input min-h-[88px]"
                    value={formData.need}
                    onChange={(e) => setField('need', e.target.value)}
                    required
                  />
                </div>
              </>
            ) : null}

            {formData.lead_type ? (
              <>
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
                  />
                </div>
                <div>
                  <Label htmlFor="phone" required={showTeacher || showCompany}>
                    Teléfono{showFamily ? ' (opcional)' : ''}
                  </Label>
                  <input
                    id="phone"
                    type="tel"
                    className="pk-input"
                    value={formData.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    required={showTeacher || showCompany}
                    autoComplete="tel"
                  />
                </div>

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

                {error ? <p className="text-sm text-red-700">{error}</p> : null}

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
              </>
            ) : null}
          </form>
        )}
      </CardContent>
    </Card>
  )
}
