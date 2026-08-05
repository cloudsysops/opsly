'use client'

import { Copy, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PESKIDS_CONTACT } from '@/lib/contact-channels'
import { useState } from 'react'

interface WhatsAppMessagePreviewProps {
  clientName: string
  clientEmail: string
  clientPhone: string
  gradeInterested: string
  classModality: 'llanogrande' | 'domicilio' | null
  leadId: string
  onCopied?: () => void
}

export function WhatsAppMessagePreview({
  clientName,
  clientEmail,
  clientPhone,
  gradeInterested,
  classModality,
  leadId,
  onCopied,
}: WhatsAppMessagePreviewProps): React.ReactElement {
  const [copied, setCopied] = useState(false)

  const adminLink = `https://peskids.op-sly.com/admin/leads/${leadId}`

  const message = `Hola, me interesa Peskids natación.

👤 Nombre: ${clientName}
📧 Email: ${clientEmail}
📞 Teléfono: ${clientPhone}
👧 Grado interesado: ${gradeInterested}
🏊 Modalidad: ${classModality === 'llanogrande' ? 'Sede Llanogrande' : 'Clases a domicilio'}

📋 Ver detalles: ${adminLink}`

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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-pk-primary/20 bg-pk-primary/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-pk-primary/70 mb-3">
          📱 Mensaje para enviar a soporte:
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
        <Button
          onClick={handleWhatsApp}
          variant="primary"
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          Enviar por WhatsApp
        </Button>
      </div>

      <div className="rounded-lg bg-pk-surface/50 px-3 py-2 text-center text-xs text-pk-sub">
        ✨ El soporte recibirá tu información completa + link para ver todos tus detalles
      </div>
    </div>
  )
}
