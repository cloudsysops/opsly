'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send } from 'lucide-react'
import { WhatsAppLink } from '@/components/contact/whatsapp-link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

const initialForm = {
  name: '',
  email: '',
  phone: '',
  grade_interested: '',
  referral_source: '',
}

export function LeadCaptureForm(): React.ReactElement {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState(initialForm)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to submit form')
      }

      router.push('/thanks')
    } catch (err) {
      setError('No pudimos enviar tu solicitud. Intenta de nuevo en un momento.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card id="contacto" accent="teal" hover className="overflow-hidden shadow-card-hover">
      <CardHeader className="border-0 bg-gradient-to-br from-pk-bg to-pk-surface pb-2">
        <p className="pk-eyebrow text-pk-primary">Reserva</p>
        <CardTitle className="text-2xl">Clase de prueba gratis</CardTitle>
        <CardDescription>
          Déjanos tus datos y te contactamos en menos de 48 horas hábiles.{' '}
          <WhatsAppLink variant="ghost" label="O escríbenos por WhatsApp" className="mt-1 inline-flex" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" required>
              Nombre del acudiente
            </Label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              minLength={2}
              maxLength={50}
              placeholder="María García"
              className="pk-input"
              autoComplete="name"
            />
          </div>

          <div>
            <Label htmlFor="email" required>
              Correo electrónico
            </Label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="tu@correo.com"
              className="pk-input"
              autoComplete="email"
            />
          </div>

          <div>
            <Label htmlFor="phone">Teléfono (opcional)</Label>
            <input
              id="phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+57 300 000 0000"
              className="pk-input"
              autoComplete="tel"
            />
          </div>

          <div>
            <Label htmlFor="grade_interested" required>
              Edad o nivel de interés
            </Label>
            <select
              id="grade_interested"
              name="grade_interested"
              value={formData.grade_interested}
              onChange={handleChange}
              required
              className="pk-select"
            >
              <option value="">Selecciona un rango</option>
              <option value="K-5">Babyswim / K–5</option>
              <option value="6-8">6–8 (Peces · Delfines)</option>
              <option value="9-12">9–12 (Tiburones · Olímpicos)</option>
              <option value="Other">Otro / consulta general</option>
            </select>
          </div>

          <div>
            <Label htmlFor="referral_source">¿Cómo nos conociste?</Label>
            <select
              id="referral_source"
              name="referral_source"
              value={formData.referral_source}
              onChange={handleChange}
              className="pk-select"
            >
              <option value="">Selecciona una opción</option>
              <option value="Google">Google / búsqueda</option>
              <option value="Friend">Recomendación</option>
              <option value="Social">Instagram / redes</option>
              <option value="Other">Otro</option>
            </select>
          </div>

          {error ? (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <Button type="submit" disabled={loading} fullWidth size="lg">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Enviando…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" aria-hidden />
                Reservar prueba gratis →
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
