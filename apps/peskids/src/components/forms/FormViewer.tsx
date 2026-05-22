'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@intcloudsysops/components';

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: { value: string; label: string }[];
}

interface FormData {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  settings: {
    successMessage: string;
  };
  status: string;
}

interface FormViewerProps {
  formId: string;
}

export function FormViewer({ formId }: FormViewerProps) {
  const [form, setForm] = useState<FormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await fetch(`/api/peskids/forms/${formId}`);
        if (!response.ok) {
          throw new Error('Failed to load form');
        }
        const data = await response.json();
        setForm(data);
        // Initialize form values
        const initialValues: Record<string, string> = {};
        data.fields.forEach((field: FormField) => {
          initialValues[field.id] = '';
        });
        setFormValues(initialValues);
      } catch (error) {
        console.error('Error loading form:', error);
        setSubmitError('Failed to load form. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchForm();
  }, [formId]);

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (form) {
      for (const field of form.fields) {
        if (field.required && !formValues[field.id]) {
          setSubmitError(`${field.label} is required`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/peskids/forms/${formId}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId,
          submissionData: formValues,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      setSubmitSuccess(true);
      setFormValues({});
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitError('Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ops-dark p-4 sm:p-6">
        <div className="mx-auto w-full max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="space-y-4 animate-pulse">
                <div className="h-8 w-1/2 rounded bg-ops-surface" />
                <div className="h-4 w-3/4 rounded bg-ops-surface" />
                <div className="space-y-3">
                  <div className="h-10 w-full rounded bg-ops-surface" />
                  <div className="h-10 w-full rounded bg-ops-surface" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-ops-dark p-4 sm:p-6">
        <div className="mx-auto w-full max-w-2xl">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-neutral-100">Form not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-ops-dark p-4 sm:p-6">
        <div className="mx-auto w-full max-w-2xl">
          <Card>
            <CardContent className="py-12 text-center">
              <div className="mb-4 text-5xl">✅</div>
              <h2 className="text-2xl font-bold text-neutral-100">Thank You!</h2>
              <p className="mt-4 text-neutral-300">{form.settings.successMessage}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ops-dark p-4 sm:p-6">
      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-neutral-100">{form.title}</CardTitle>
            {form.description && (
              <CardDescription className="text-ops-gray">{form.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {submitError && (
                <div className="rounded-lg bg-red-500/20 p-4 text-red-400">
                  {submitError}
                </div>
              )}

              {form.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <label htmlFor={field.id} className="block text-sm font-medium text-neutral-100">
                    {field.label}
                    {field.required && <span className="ml-1 text-red-500">*</span>}
                  </label>

                  {field.type === 'textarea' ? (
                    <textarea
                      id={field.id}
                      name={field.id}
                      value={formValues[field.id] || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      required={field.required}
                      className="w-full rounded-lg border border-ops-border bg-ops-surface px-3 py-2 text-base sm:text-sm text-neutral-100 placeholder-ops-gray focus:border-ops-blue focus:outline-none"
                      rows={4}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      id={field.id}
                      name={field.id}
                      value={formValues[field.id] || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      required={field.required}
                      className="w-full rounded-lg border border-ops-border bg-ops-surface px-3 py-2 text-base sm:text-sm text-neutral-100 focus:border-ops-blue focus:outline-none"
                    >
                      <option value="">Select an option</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <input
                      id={field.id}
                      name={field.id}
                      type="checkbox"
                      checked={formValues[field.id] === 'on'}
                      onChange={(e) => handleFieldChange(field.id, e.target.checked ? 'on' : '')}
                      required={field.required}
                      className="h-4 w-4 rounded border-ops-border bg-ops-surface text-ops-blue focus:ring-2 focus:ring-ops-blue"
                    />
                  ) : field.type === 'radio' ? (
                    <div className="space-y-2">
                      {field.options?.map((option) => (
                        <label key={option.value} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={field.id}
                            value={option.value}
                            checked={formValues[field.id] === option.value}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            required={field.required}
                            className="h-4 w-4 border-ops-border bg-ops-surface text-ops-blue"
                          />
                          <span className="text-neutral-100">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      id={field.id}
                      name={field.id}
                      type={field.type === 'date' ? 'date' : field.type}
                      value={formValues[field.id] || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      required={field.required}
                      className="w-full rounded-lg border border-ops-border bg-ops-surface px-3 py-2 text-base sm:text-sm text-neutral-100 placeholder-ops-gray focus:border-ops-blue focus:outline-none"
                    />
                  )}
                </div>
              ))}

              <div className="flex flex-col gap-2 pt-4 sm:pt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-ops-blue hover:bg-ops-blue/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
