'use client'

import { Copy, Mail, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PESKIDS_CONTACT } from '@/lib/contact-channels'
import { useState } from 'react'

type PeskidsLeadType = 'family' | 'teacher_applicant' | 'company'

interface WhatsAppMessagePreviewProps {
  clientName: string
  clientEmail: string
  clientPhone: string
  leadType: PeskidsLeadType
  gradeInterested: string
  classModality: 'llanogrande' | 'domicilio' | null
  companyName: string | null
  companyNit: string | null
  metadata: Record<string, unknown> | null
  leadId: string
  onCopied?: () => void
}

function metadataString(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function buildSummaryLines({
  leadType,
  gradeInterested,
  classModality,
  companyName,
  companyNit,
  metadata,
}: WhatsAppMessagePreviewProps): string {
  if (leadType === 'teacher_applicant') {
    const experience = metadataString(metadata, 'experience')
    const availability = metadataString(metadata, 'availability')
    const workZones = metadataString(metadata, 'work_zones')
    const lines = ['🏊 Interesado en trabajar como profesor']
    if (experience) lines.push(`💼 Experiencia: ${experience}`)
    if (availability) lines.push(`🕒 Disponibilidad: ${availability}`)
    if (workZones) lines.push(`📍 Zonas: ${workZones}`)
    return lines.join('\n')
  }

  if (leadType === 'company') {
    const contactRole = metadataString(metadata, 'contact_role')
    const need = metadataString(metadata, 'need')
    const lines = [`🏢 Institución: ${companyName ?? 'No indicada'}`]
    if (companyNit) lines.push(`🧾 NIT: ${companyNit}`)
    if (contactRole) lines.push(`👔 Cargo: ${contactRole}`)
    if (need) lines.push(`📝 Necesidad: ${need}`)
    return lines.join('\n')
  }

  return [
    `👧 Grado interesado: ${gradeInterested}`,
    `🏊 Modalidad: ${classModality === 'llanogrande' ? 'Sede Llanogrande' : 'Clases a domicilio'}`,
  ].join('\n')
}

export function WhatsAppMessagePreview(props: WhatsAppMessagePreviewProps): React.ReactElement {
  const { clientName, clientEmail, clientPhone, leadType, classModality, leadId, onCopied } = props
  const [copied, setCopied] = useState(false)
  const sendByEmail = leadType === 'teacher_applicant' || leadType === 'company'

  const peskidsUrl = process.env.NEXT_PUBLIC_PESKIDS_URL || 'https://www.peskids.com'
  const adminLink = `${peskidsUrl}/admin/interesados/${leadId}`

  const message = `Hola Peskids, mi nombre es ${clientName}.

📧 Email: ${clientEmail}
📞 Teléfono: ${clientPhone}
${buildSummaryLines(props)}

📋 Ver mi solicitud: ${adminLink}`

  const whatsappNumber =
    classModality === 'domicilio'
      ? PESKIDS_CONTACT.whatsapp.domicilio.e164
      : classModality === 'llanogrande'
        ? PESKIDS_CONTACT.whatsapp.llanogrande.e164
        : PESKIDS_CONTACT.whatsapp.e164

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      onCopied?.()
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleWhatsApp = () => {
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`
    window.open(whatsappUrl, '_blank')
  }

  const handleEmail = () => {
    const subject = encodeURIComponent(
      leadType === 'teacher_applicant'
        ? `Nueva solicitud de profesor: ${clientName}`
        : `Nueva alianza empresarial: ${clientName}`
    )
    const body = encodeURIComponent(message)
    window.location.href = `mailto:${PESKIDS_CONTACT.email}?subject=${subject}&body=${body}`
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-pk-primary/20 bg-pk-primary/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-pk-primary/70 mb-3">
          {sendByEmail ? '📧 Mensaje para enviar a soporte:' : '📱 Mensaje para enviar a soporte:'}
        </p>
        <div className="bg-white rounded-lg p-4 text-sm text-pk-ink font-mono whitespace-pre-wrap break-words max-h-64 overflow-y-auto border border-pk-border">
          {message}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={handleCopy}
          variant="secondary"
          className="gap-2"
        >
          <Copy className="h-4 w-4" />
          {copied ? 'Copiado!' : 'Copiar'}
        </Button>
        {sendByEmail ? (
          <Button
            onClick={handleEmail}
            variant="primary"
            className="gap-2"
          >
            <Mail className="h-4 w-4" />
            Enviar por Email
          </Button>
        ) : (
          <Button
            onClick={handleWhatsApp}
            variant="primary"
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Enviar por WhatsApp
          </Button>
        )}
      </div>

      <div className="rounded-lg bg-pk-surface/50 px-3 py-2 text-center text-xs text-pk-sub">
        ✨ El soporte recibirá tu información completa + link para ver todos tus detalles
      </div>
    </div>
  )
}
