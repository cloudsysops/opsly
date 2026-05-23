'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormField } from '@/lib/form-types';

interface FormSubmissionProps {
  form: Form;
  onSubmit?: (data: Record<string, unknown>) => Promise<void>;
  isLoading?: boolean;
}

export function FormSubmission({ form, onSubmit, isLoading = false }: FormSubmissionProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    form.fields.forEach((field) => {
      const value = formData[field.id];

      if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
        newErrors[field.id] = `${field.label} is required`;
      }

      if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          newErrors[field.id] = 'Please enter a valid email';
        }
      }

      if (field.type === 'phone' && value) {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(String(value))) {
          newErrors[field.id] = 'Please enter a valid phone number';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form.fields, formData]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      if (onSubmit) {
        try {
          await onSubmit(formData);
          setSubmitted(true);
          setFormData({});
        } catch (error) {
          console.error('Failed to submit form:', error);
        }
      }
    },
    [formData, validateForm, onSubmit]
  );

  if (submitted) {
    return (
      <div className="mx-auto w-full max-w-2xl p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mb-4 text-4xl">✓</div>
            <h2 className="mb-2 text-2xl font-semibold text-neutral-100">
              {form.settings.successMessage || 'Thank you for your submission!'}
            </h2>
            <p className="text-ops-gray">We have received your response and will be in touch soon.</p>
            <Button
              onClick={() => setSubmitted(false)}
              className="mt-6 bg-ops-blue hover:bg-ops-blue/90"
            >
              Submit Another Response
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>{form.title}</CardTitle>
          {form.description && <CardDescription>{form.description}</CardDescription>}
        </CardHeader>
      </Card>

      {form.settings.showProgressBar && (
        <div className="w-full overflow-hidden rounded bg-ops-surface">
          <div
            className="h-1 bg-ops-green transition-all"
            style={{ width: `${((form.fields.length - Object.keys(errors).length) / form.fields.length) * 100}%` }}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {form.fields.map((field) => (
          <FormFieldInput
            key={field.id}
            field={field}
            value={formData[field.id]}
            error={errors[field.id]}
            onChange={(value) => {
              setFormData((prev) => ({ ...prev, [field.id]: value }));
              if (errors[field.id]) {
                setErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors[field.id];
                  return newErrors;
                });
              }
            }}
          />
        ))}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-ops-green hover:bg-ops-green/90"
          size="lg"
        >
          {isLoading ? 'Submitting...' : 'Submit'}
        </Button>
      </form>
    </div>
  );
}

interface FormFieldInputProps {
  field: FormField;
  value?: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}

function FormFieldInput({ field, value, error, onChange }: FormFieldInputProps) {
  const baseClasses =
    'w-full rounded border px-3 py-2 text-neutral-100 bg-ops-surface focus:outline-none focus:ring-2 focus:ring-ops-blue';
  const errorClasses = error ? 'border-ops-red' : 'border-ops-border';

  const commonInputClass = `${baseClasses} ${errorClasses}`;

  const label = (
    <label className="mb-2 block text-sm font-medium text-neutral-200">
      {field.label}
      {field.required && <span className="ml-1 text-ops-red">*</span>}
    </label>
  );

  const errorMessage = error && (
    <p className="mt-1 text-xs text-ops-red">{error}</p>
  );

  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'number':
      return (
        <div>
          {label}
          <input
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'number' ? 'number' : 'text'}
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={commonInputClass}
          />
          {errorMessage}
        </div>
      );

    case 'textarea':
      return (
        <div>
          {label}
          <textarea
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={commonInputClass}
            rows={4}
          />
          {errorMessage}
        </div>
      );

    case 'select':
      return (
        <div>
          {label}
          <select
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            className={commonInputClass}
          >
            <option value="">Select an option</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errorMessage}
        </div>
      );

    case 'radio':
      return (
        <div>
          {label}
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={field.id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(e.target.value)}
                  className="rounded border-ops-border"
                />
                <span className="text-sm text-neutral-200">{option.label}</span>
              </label>
            ))}
          </div>
          {errorMessage}
        </div>
      );

    case 'checkbox':
      return (
        <div>
          {label}
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={Array.isArray(value) && value.includes(option.value)}
                  onChange={(e) => {
                    const current = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      onChange([...current, option.value]);
                    } else {
                      onChange(current.filter((v) => v !== option.value));
                    }
                  }}
                  className="rounded border-ops-border"
                />
                <span className="text-sm text-neutral-200">{option.label}</span>
              </label>
            ))}
          </div>
          {errorMessage}
        </div>
      );

    case 'date':
      return (
        <div>
          {label}
          <input
            type="date"
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            className={commonInputClass}
          />
          {errorMessage}
        </div>
      );

    case 'file':
      return (
        <div>
          {label}
          <input
            type="file"
            onChange={(e) => onChange(e.target.files?.[0])}
            className={commonInputClass}
          />
          {errorMessage}
        </div>
      );

    default:
      return null;
  }
}
