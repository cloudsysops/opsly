'use client';

import { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Form, FormSubmission as FormSubmissionType } from '@/lib/form-types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { peskidsColorTokens } from '@/lib/tokens';

interface FormSubmissionProps {
  form: Form;
  onSubmit: (submission: FormSubmissionType) => Promise<void>;
  isLoading?: boolean;
  successUrl?: string;
}

type FormValues = Record<string, string | string[]>;

export function FormSubmission({
  form,
  onSubmit,
  isLoading = false,
  successUrl,
}: FormSubmissionProps): React.ReactElement {
  const [values, setValues] = useState<FormValues>(
    form.fields.reduce((acc, field) => {
      acc[field.id] = field.type === 'checkbox' ? [] : '';
      return acc;
    }, {} as FormValues)
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const validateField = (fieldId: string, value: string | string[]): string | null => {
    const field = form.fields.find((f) => f.id === fieldId);
    if (!field) return null;

    if (field.required && (!value || (Array.isArray(value) && value.length === 0))) {
      return 'Este campo es requerido';
    }

    if (typeof value === 'string') {
      if (field.validation?.minLength && value.length < field.validation.minLength) {
        return `Mínimo ${field.validation.minLength} caracteres`;
      }

      if (field.validation?.maxLength && value.length > field.validation.maxLength) {
        return `Máximo ${field.validation.maxLength} caracteres`;
      }

      if (field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !emailRegex.test(value)) {
          return 'Correo electrónico no válido';
        }
      }

      if (field.type === 'phone') {
        const phoneRegex = /^[\d\s+()\\-]+$/;
        if (value && !phoneRegex.test(value)) {
          return 'Número telefónico no válido';
        }
      }

      if (field.validation?.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (value && !regex.test(value)) {
          return field.validation.errorMessage || 'Formato no válido';
        }
      }
    }

    return null;
  };

  const handleChange = (fieldId: string, value: string, isCheckbox?: boolean): void => {
    if (isCheckbox) {
      setValues((prev) => {
        const arr = Array.isArray(prev[fieldId]) ? prev[fieldId] : [];
        return {
          ...prev,
          [fieldId]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
        };
      });
    } else {
      setValues((prev) => ({
        ...prev,
        [fieldId]: value,
      }));
    }

    if (errors[fieldId]) {
      const error = validateField(fieldId, isCheckbox ? values[fieldId] : value);
      setErrors((prev) => ({
        ...prev,
        [fieldId]: error || '',
      }));
    }
  };

  const handleBlur = (fieldId: string): void => {
    const error = validateField(fieldId, values[fieldId]);
    setErrors((prev) => ({
      ...prev,
      [fieldId]: error || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');

    const newErrors: Record<string, string> = {};
    for (const field of form.fields) {
      const error = validateField(field.id, values[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const submission: FormSubmissionType = {
        id: `submission_${Date.now()}`,
        formId: form.id,
        tenantSlug: form.tenantSlug,
        data: values,
        submittedAt: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      };

      await onSubmit(submission);

      if (form.settings.successUrl || successUrl) {
        window.location.href = form.settings.successUrl || successUrl || '/';
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No pudimos procesar tu solicitud. Intenta de nuevo en un momento.'
      );
    }
  };

  if (submitted) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <div className="space-y-3 text-center">
          <CheckCircle
            className="mx-auto h-12 w-12"
            style={{ color: peskidsColorTokens.status.success }}
          />
          <h2 className="text-2xl font-bold text-pk-ink">
            {form.settings.successMessage || '¡Gracias!'}
          </h2>
          <p className="text-pk-sub">Tu respuesta ha sido registrada correctamente.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-pk-ink">{form.title}</h1>
        {form.description && <p className="mt-2 text-pk-sub">{form.description}</p>}
      </div>

      {form.settings.showProgressBar && form.fields.length > 0 && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-pk-muted">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${(Object.values(errors).filter((e) => !e).length / form.fields.length) * 100}%`,
              backgroundColor: peskidsColorTokens.primary.teal,
            }}
          />
        </div>
      )}

      <div className="space-y-4">
        {form.fields.map((field) => {
          const value = values[field.id];
          const fieldError = errors[field.id];

          return (
            <div key={field.id}>
              <Label htmlFor={field.id} className={fieldError ? 'text-red-600' : ''}>
                {field.label}
                {field.required && <span className="text-red-500"> *</span>}
              </Label>

              {field.description && (
                <p className="mt-1 text-xs text-pk-mutedText">{field.description}</p>
              )}

              <div className="mt-2">
                {field.type === 'textarea' ? (
                  <textarea
                    id={field.id}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    onBlur={() => handleBlur(field.id)}
                    placeholder={field.placeholder}
                    required={field.required}
                    minLength={field.validation?.minLength}
                    maxLength={field.validation?.maxLength}
                    className={`pk-input min-h-[100px] ${fieldError ? 'border-red-500' : ''}`}
                  />
                ) : field.type === 'select' ? (
                  <select
                    id={field.id}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    onBlur={() => handleBlur(field.id)}
                    required={field.required}
                    className={`pk-select ${fieldError ? 'border-red-500' : ''}`}
                  >
                    <option value="">Selecciona una opción</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <div className="space-y-2">
                    {field.options?.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          value={opt.value}
                          checked={Array.isArray(value) && value.includes(opt.value)}
                          onChange={(e) => handleChange(field.id, e.target.value, true)}
                          className="h-4 w-4 rounded"
                        />
                        <span className="text-sm text-pk-ink">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                ) : field.type === 'radio' ? (
                  <div className="space-y-2">
                    {field.options?.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={field.id}
                          value={opt.value}
                          checked={typeof value === 'string' && value === opt.value}
                          onChange={(e) => handleChange(field.id, e.target.value)}
                          required={field.required}
                          className="h-4 w-4"
                        />
                        <span className="text-sm text-pk-ink">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                ) : field.type === 'file' ? (
                  <input
                    id={field.id}
                    type="file"
                    onChange={(e) => handleChange(field.id, e.target.files?.[0]?.name || '')}
                    required={field.required}
                    className={`pk-input ${fieldError ? 'border-red-500' : ''}`}
                  />
                ) : (
                  <input
                    id={field.id}
                    type={field.type}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    onBlur={() => handleBlur(field.id)}
                    placeholder={field.placeholder}
                    required={field.required}
                    minLength={field.validation?.minLength}
                    maxLength={field.validation?.maxLength}
                    className={`pk-input ${fieldError ? 'border-red-500' : ''}`}
                  />
                )}
              </div>

              {fieldError && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {fieldError}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        fullWidth
        size="lg"
        style={{ backgroundColor: peskidsColorTokens.primary.teal }}
        className="text-white"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando…
          </>
        ) : (
          'Enviar respuesta'
        )}
      </Button>
    </form>
  );
}
