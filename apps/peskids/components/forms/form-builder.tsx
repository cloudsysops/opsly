'use client';

import { useState } from 'react';
import { Plus, Trash2, Copy, Eye, EyeOff } from 'lucide-react';
import { Form, FormField, FieldType } from '@/lib/form-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { peskidsColorTokens } from '@/lib/tokens';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Texto' },
  { value: 'email', label: 'Correo' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'number', label: 'Número' },
  { value: 'textarea', label: 'Párrafo' },
  { value: 'select', label: 'Menú' },
  { value: 'checkbox', label: 'Casilla' },
  { value: 'radio', label: 'Botón de radio' },
  { value: 'date', label: 'Fecha' },
  { value: 'file', label: 'Archivo' },
];

interface FormBuilderProps {
  initialForm?: Form;
  onSave: (form: Form) => Promise<void>;
  isLoading?: boolean;
}

export function FormBuilder({
  initialForm,
  onSave,
  isLoading = false,
}: FormBuilderProps): React.ReactElement {
  const [form, setForm] = useState<Form>(
    initialForm || {
      id: `form_${Date.now()}`,
      tenantSlug: 'peskids',
      title: 'Nueva forma',
      description: '',
      fields: [],
      settings: {
        showProgressBar: true,
        requiresAuth: false,
      },
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );

  const [showPreview, setShowPreview] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setForm((prev) => ({
      ...prev,
      title: e.target.value,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setForm((prev) => ({
      ...prev,
      description: e.target.value,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleAddField = (fieldType: FieldType): void => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: fieldType,
      label: `Campo de ${fieldType}`,
      required: false,
    };

    setForm((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleUpdateField = (fieldId: string, updates: Partial<FormField>): void => {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDuplicateField = (fieldId: string): void => {
    const fieldToDuplicate = form.fields.find((f) => f.id === fieldId);
    if (!fieldToDuplicate) return;

    const newField: FormField = {
      ...fieldToDuplicate,
      id: `field_${Date.now()}`,
      label: `${fieldToDuplicate.label} (copia)`,
    };

    setForm((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleRemoveField = (fieldId: string): void => {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== fieldId),
      updatedAt: new Date().toISOString(),
    }));
    setSelectedFieldId(null);
  };

  const handleSave = async (): Promise<void> => {
    await onSave(form);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-4">
          {/* Form Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalles de la forma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="form-title">Título</Label>
                <input
                  id="form-title"
                  type="text"
                  value={form.title}
                  onChange={handleTitleChange}
                  placeholder="Ej. Inscripción a natación"
                  className="pk-input"
                />
              </div>

              <div>
                <Label htmlFor="form-description">Descripción (opcional)</Label>
                <textarea
                  id="form-description"
                  value={form.description || ''}
                  onChange={handleDescriptionChange}
                  placeholder="Instrucciones o información adicional para quien rellena la forma"
                  className="pk-input min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Fields Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Campos ({form.fields.length})</CardTitle>
              <CardDescription>Arrastra para reordenar, haz clic para editar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.fields.length === 0 ? (
                <p className="py-6 text-center text-sm text-pk-mutedText">
                  No hay campos aún. Agrega uno usando los botones de abajo.
                </p>
              ) : (
                form.fields.map((field) => (
                  <div
                    key={field.id}
                    className={`rounded-lg border-2 p-3 transition ${
                      selectedFieldId === field.id
                        ? 'border-pk-primary bg-pk-primary/5'
                        : 'border-pk-border bg-pk-surface'
                    } cursor-pointer hover:border-pk-primary/60`}
                    onClick={() => setSelectedFieldId(field.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-pk-ink">{field.label}</p>
                        <p className="text-xs text-pk-mutedText">
                          {FIELD_TYPES.find((t) => t.value === field.type)?.label}
                          {field.required ? ' • Requerido' : ''}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateField(field.id);
                          }}
                          className="rounded p-1 text-pk-mutedText hover:bg-pk-muted hover:text-pk-ink"
                          title="Duplicar campo"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveField(field.id);
                          }}
                          className="rounded p-1 text-pk-mutedText hover:bg-red-100 hover:text-red-600"
                          title="Eliminar campo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Field Editor & Preview Toggle */}
        <div className="space-y-4">
          {/* Field Editor */}
          {selectedFieldId ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Editar campo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const field = form.fields.find((f) => f.id === selectedFieldId);
                  if (!field) return null;

                  return (
                    <>
                      <div>
                        <Label htmlFor="field-label" className="text-sm">
                          Etiqueta
                        </Label>
                        <input
                          id="field-label"
                          type="text"
                          value={field.label}
                          onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                          className="pk-input"
                        />
                      </div>

                      {field.type !== 'checkbox' && field.type !== 'radio' && (
                        <div>
                          <Label htmlFor="field-placeholder" className="text-sm">
                            Placeholder (opcional)
                          </Label>
                          <input
                            id="field-placeholder"
                            type="text"
                            value={field.placeholder || ''}
                            onChange={(e) =>
                              handleUpdateField(field.id, { placeholder: e.target.value })
                            }
                            className="pk-input"
                          />
                        </div>
                      )}

                      <div>
                        <Label htmlFor="field-description" className="text-sm">
                          Descripción (opcional)
                        </Label>
                        <textarea
                          id="field-description"
                          value={field.description || ''}
                          onChange={(e) =>
                            handleUpdateField(field.id, { description: e.target.value })
                          }
                          className="pk-input min-h-[60px] text-sm"
                        />
                      </div>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            handleUpdateField(field.id, { required: e.target.checked })
                          }
                          className="h-4 w-4 rounded"
                        />
                        <span className="text-sm font-medium text-pk-ink">Campo requerido</span>
                      </label>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Agregar campo</CardTitle>
                <CardDescription className="text-xs">Selecciona un tipo de campo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {FIELD_TYPES.map((type) => (
                  <Button
                    key={type.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => handleAddField(type.value)}
                    className="justify-start"
                  >
                    <Plus className="mr-2 h-3 w-3" />
                    {type.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Preview Toggle */}
          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            {showPreview ? (
              <>
                <EyeOff className="h-4 w-4" />
                Ocultar vista previa
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Ver vista previa
              </>
            )}
          </Button>

          {/* Save Button */}
          <Button
            type="button"
            disabled={isLoading || form.fields.length === 0}
            fullWidth
            size="lg"
            onClick={handleSave}
            style={{
              backgroundColor: peskidsColorTokens.primary.teal,
            }}
            className="text-white"
          >
            {isLoading ? 'Guardando...' : 'Guardar forma'}
          </Button>
        </div>
      </div>

      {/* Preview Modal/Section */}
      {showPreview && (
        <Card className="border-2" style={{ borderColor: `${peskidsColorTokens.primary.teal}40` }}>
          <CardHeader style={{ backgroundColor: `${peskidsColorTokens.primary.teal}08` }}>
            <CardTitle className="text-base">Vista previa</CardTitle>
            <CardDescription>Así verán los usuarios la forma</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border-2 border-pk-border p-6 bg-pk-surface">
              <h2 className="text-2xl font-bold text-pk-ink">{form.title}</h2>
              {form.description && <p className="mt-2 text-pk-sub">{form.description}</p>}
              <div className="mt-6 space-y-4">
                {form.fields.map((field) => (
                  <div key={field.id}>
                    <label className="block font-medium text-pk-ink">
                      {field.label}
                      {field.required && <span className="text-red-500"> *</span>}
                    </label>
                    {field.description && (
                      <p className="text-xs text-pk-mutedText mt-1">{field.description}</p>
                    )}
                    <div className="mt-2 rounded bg-pk-bg px-3 py-2 text-sm text-pk-mutedText">
                      {field.type === 'textarea'
                        ? '[Área de texto]'
                        : field.type === 'select'
                          ? '[Menú desplegable]'
                          : field.type === 'file'
                            ? '[Cargador de archivos]'
                            : `[Campo de ${field.type}]`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
