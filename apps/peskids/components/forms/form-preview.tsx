'use client'

import { Form } from '@/lib/form-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { peskidsColorTokens } from '@/lib/tokens'

interface FormPreviewProps {
  form: Form
  compact?: boolean
}

export function FormPreview({ form, compact = false }: FormPreviewProps): React.ReactElement {
  if (compact) {
    return (
      <div className="rounded-lg border-2 border-pk-border p-4 bg-pk-surface">
        <h3 className="font-semibold text-pk-ink">{form.title}</h3>
        {form.description && <p className="mt-1 text-xs text-pk-mutedText">{form.description}</p>}
        <p className="mt-2 text-xs text-pk-mutedText">{form.fields.length} campos</p>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader style={{ backgroundColor: `${peskidsColorTokens.primary.teal}08` }}>
        <CardTitle>{form.title}</CardTitle>
        {form.description && <CardDescription>{form.description}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {form.fields.length === 0 ? (
            <p className="text-center text-sm text-pk-mutedText py-8">Sin campos aún</p>
          ) : (
            form.fields.map((field, index) => (
              <div key={field.id}>
                <label className="block">
                  <span className="font-medium text-pk-ink">
                    {field.label}
                    {field.required && <span className="text-red-500"> *</span>}
                  </span>
                  {field.description && <p className="mt-1 text-xs text-pk-mutedText">{field.description}</p>}
                </label>

                <div className="mt-2 rounded bg-pk-bg px-3 py-2 text-sm text-pk-mutedText border border-pk-border">
                  {field.type === 'textarea' ? (
                    <textarea disabled placeholder={field.placeholder} className="w-full bg-transparent" rows={3} />
                  ) : field.type === 'select' ? (
                    <select disabled className="w-full bg-transparent">
                      <option>{field.placeholder || 'Selecciona…'}</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <div className="space-y-1.5">
                      {field.options?.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2">
                          <input type="checkbox" disabled className="h-3 w-3" />
                          <span className="text-xs">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : field.type === 'radio' ? (
                    <div className="space-y-1.5">
                      {field.options?.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2">
                          <input type="radio" disabled className="h-3 w-3" />
                          <span className="text-xs">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : field.type === 'file' ? (
                    <input type="file" disabled placeholder={field.placeholder} className="w-full bg-transparent" />
                  ) : (
                    <input
                      type={field.type}
                      disabled
                      placeholder={field.placeholder}
                      className="w-full bg-transparent"
                    />
                  )}
                </div>

                {index < form.fields.length - 1 && <div className="mt-4 border-b border-pk-border" />}
              </div>
            ))
          )}
        </div>

        {form.settings.showProgressBar && form.fields.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-xs font-medium text-pk-mutedText">Barra de progreso</p>
            <div className="h-1 w-full overflow-hidden rounded-full bg-pk-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: '33%',
                  backgroundColor: peskidsColorTokens.primary.teal,
                }}
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-2 pt-6 border-t border-pk-border">
          <button
            disabled
            className="flex-1 rounded-lg py-2 px-4 text-sm font-medium text-white transition"
            style={{ backgroundColor: peskidsColorTokens.primary.teal, opacity: 0.7 }}
          >
            Enviar respuesta
          </button>
        </div>

        <div className="mt-4 space-y-2 rounded-lg bg-pk-bg px-3 py-2">
          <p className="text-xs font-medium text-pk-mutedText">Configuración</p>
          <ul className="space-y-1 text-xs text-pk-mutedText">
            <li>• Estado: <span className="font-medium">{form.status}</span></li>
            <li>• Campos: <span className="font-medium">{form.fields.length}</span></li>
            {form.settings.requiresAuth && <li>• Requiere autenticación</li>}
            {form.settings.successUrl && <li>• Redirige a: {form.settings.successUrl}</li>}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
