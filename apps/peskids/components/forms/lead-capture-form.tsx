'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { WhatsAppLink } from '@/components/contact/whatsapp-link';
import { PESKIDS_CLASS_MODALITY_OPTIONS } from '@/lib/lead-modality';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  class_modality: '',
  neighborhood: '',
  grade_interested: '',
  referral_source: '',
};

// Version of the parental+treatment consent policy shown to the user
const CONSENT_POLICY_VERSION = 'pk-parental-v1+pk-privacy-v1@1.0';

export function LeadCaptureForm(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(initialForm);
  const [consentTreatment, setConsentTreatment] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const referredByCode = useMemo(
    () => searchParams.get('ref')?.trim().toUpperCase() ?? '',
    [searchParams]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const apiPayload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        class_modality: formData.class_modality || null,
        neighborhood: formData.neighborhood || null,
        grade_interested: formData.grade_interested || null,
        referral_source: formData.referral_source || null,
        referred_by_code: referredByCode || null,
        consent_treatment: consentTreatment,
        consent_marketing: consentMarketing,
        consent_policy_version: CONSENT_POLICY_VERSION,
      };

      const apiResponse = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });

      if (!apiResponse.ok) {
        const apiErrorText = await apiResponse.text();
        console.error('Peskids lead API error:', apiResponse.status, apiErrorText);
        throw new Error(`Lead API failed: ${apiResponse.status}`);
      }

      const apiResult = (await apiResponse.json()) as {
        referral_link?: string | null;
        referral_code?: string | null;
      };

      const webhookPayload = {
        full_name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        source: 'web',
        class_modality: formData.class_modality || null,
        neighborhood: formData.neighborhood || null,
        grade_interested: formData.grade_interested || null,
        referral_source: formData.referral_source || null,
        referred_by_code: referredByCode || null,
        referral_code: apiResult.referral_code || null,
      };

      const webhookUrl =
        process.env.NEXT_PUBLIC_N8N_LEAD_WEBHOOK ||
        'https://peskids.op-sly.com/webhooks/lead-capture';
      void fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      }).catch((err) => {
        console.warn('N8N webhook mirror failed:', err);
      });

      const thanksUrl = new URL('/thanks', window.location.origin);
      if (apiResult.referral_link) {
        thanksUrl.searchParams.set('referral_link', apiResult.referral_link);
      }
      if (apiResult.referral_code) {
        thanksUrl.searchParams.set('referral_code', apiResult.referral_code);
      }
      router.push(`${thanksUrl.pathname}${thanksUrl.search}`);
    } catch (err) {
      setError('No pudimos enviar tu solicitud. Intenta de nuevo en un momento.');
      console.error('Form submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      id="contacto"
      accent="teal"
      hover
      className="scroll-mt-28 overflow-hidden border-2 border-pk-primary/40 shadow-[0_20px_50px_rgba(45,183,176,0.22)] ring-2 ring-pk-primary/15"
    >
      <CardHeader className="border-0 bg-gradient-to-br from-pk-primary/10 via-pk-bg to-pk-surface pb-2">
        <p className="pk-eyebrow text-pk-primary">Reserva aquí</p>
        <CardTitle className="text-2xl sm:text-3xl">Clase de prueba gratis</CardTitle>
        <CardDescription>
          Clases en nuestra sede de <strong className="text-pk-ink">Llanogrande</strong> o{' '}
          <strong className="text-pk-ink">a domicilio</strong> en el área metropolitana. Te
          contactamos en menos de 48 horas hábiles.{' '}
          <WhatsAppLink
            variant="button"
            label="Prefiero WhatsApp"
            className="mt-2 w-full sm:w-auto"
          />
        </CardDescription>
        {referredByCode ? (
          <p className="mt-3 rounded-xl border border-pk-primary/20 bg-pk-primary/10 px-3 py-2 text-xs font-medium text-pk-primary">
            Código de recomendación activo: <span className="font-mono">{referredByCode}</span>
          </p>
        ) : null}
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
            <Label htmlFor="class_modality" required>
              Modalidad de clase
            </Label>
            <select
              id="class_modality"
              name="class_modality"
              value={formData.class_modality}
              onChange={handleChange}
              required
              className="pk-select"
            >
              <option value="">¿Dónde prefieres la clase?</option>
              {PESKIDS_CLASS_MODALITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="neighborhood" required>
              Barrio o zona
            </Label>
            <input
              id="neighborhood"
              type="text"
              name="neighborhood"
              value={formData.neighborhood}
              onChange={handleChange}
              required
              minLength={2}
              maxLength={80}
              placeholder="Ej. Llanogrande, El Retiro, Envigado…"
              className="pk-input"
              autoComplete="address-level3"
            />
            <p className="mt-1 text-xs text-pk-sub">
              Nos ayuda a ubicarte y, si eliges domicilio, coordinar la visita del instructor.
            </p>
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
              <option value="Instagram">Instagram / redes</option>
              <option value="Other">Otro</option>
            </select>
          </div>

          <div className="space-y-3 rounded-xl border border-pk-border bg-pk-muted/60 px-4 py-3 text-xs text-pk-sub">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={consentTreatment}
                onChange={(e) => setConsentTreatment(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-pk-border accent-pk-primary"
                required
                aria-required="true"
              />
              <span>
                <strong>Autorización obligatoria:</strong> Soy padre, madre o tutor legal y autorizo
                a Peskids para tratar los datos del menor y los míos propios conforme a la{' '}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener"
                  className="text-pk-primary hover:underline"
                >
                  Política de Privacidad
                </a>{' '}
                y el{' '}
                <a
                  href="/aviso-parental"
                  target="_blank"
                  rel="noopener"
                  className="text-pk-primary hover:underline"
                >
                  Aviso Parental
                </a>
                . Los datos serán compartidos con <strong>Jelou</strong> (mensajería) y nuestra{' '}
                <strong>automatización interna</strong> para coordinar la clase de prueba.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={consentMarketing}
                onChange={(e) => setConsentMarketing(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-pk-border accent-pk-primary"
              />
              <span>
                <strong>Opcional:</strong> Acepto recibir comunicaciones sobre el programa
                (novedades, torneos, promociones) por WhatsApp o correo electrónico. Puedo cancelar
                en cualquier momento.
              </span>
            </label>
          </div>

          {error ? (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <Button type="submit" disabled={loading || !consentTreatment} fullWidth size="lg">
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
  );
}
