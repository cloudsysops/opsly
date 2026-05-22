'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@intcloudsysops/components';
import { Form, FormField } from '@/lib/form-types';

interface FormPreviewProps {
  form: Form;
  isEditing?: boolean;
}

export function FormPreview({ form, isEditing = false }: FormPreviewProps) {
  return (
    <div className="w-full space-y-4 p-6">
      {/* Form Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{form.title || 'Untitled Form'}</CardTitle>
          {form.description && <CardDescription>{form.description}</CardDescription>}
        </CardHeader>
      </Card>

      {/* Progress Bar */}
      {form.settings.showProgressBar && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-ops-gray">
            <span>Progress</span>
            <span>0%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ops-surface">
            <div className="h-full w-0 bg-ops-green transition-all" />
          </div>
        </div>
      )}

      {/* Form Fields Preview */}
      <div className="space-y-4">
        {form.fields.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-ops-gray">No fields in this form yet.</p>
            </CardContent>
          </Card>
        ) : (
          form.fields.map((field) => <FieldPreview key={field.id} field={field} />)
        )}
      </div>

      {/* Submit Button */}
      {form.fields.length > 0 && (
        <div className="pt-4">
          <button className="w-full rounded bg-ops-green px-4 py-2 font-medium text-neutral-900 transition hover:bg-ops-green/90">
            Submit
          </button>
        </div>
      )}

      {/* Info Box */}
      {isEditing && (
        <Card className="border-ops-blue/30 bg-ops-surface/50">
          <CardContent className="py-4">
            <p className="text-xs text-ops-gray">
              💡 <span className="ml-2">This is a preview. Changes will appear here as you build your form.</span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface FieldPreviewProps {
  field: FormField;
}

function FieldPreview({ field }: FieldPreviewProps) {
  const fieldLabel = (
    <label className="mb-2 block text-sm font-medium text-neutral-200">
      {field.label}
      {field.required && <span className="ml-1 text-ops-red">*</span>}
    </label>
  );

  const baseInputClass =
    'w-full rounded border border-ops-border bg-ops-surface px-3 py-2 text-neutral-100 placeholder-ops-gray focus:outline-none focus:ring-2 focus:ring-ops-blue';

  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'number':
      return (
        <Card>
          <CardContent className="pt-6">
            {fieldLabel}
            <input
              type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'number' ? 'number' : 'text'}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              disabled
              className={`${baseInputClass} disabled:cursor-not-allowed disabled:opacity-50`}
            />
            {field.description && (
              <p className="mt-2 text-xs text-ops-gray">{field.description}</p>
            )}
          </CardContent>
        </Card>
      );

    case 'textarea':
      return (
        <Card>
          <CardContent className="pt-6">
            {fieldLabel}
            <textarea
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              disabled
              rows={4}
              className={`${baseInputClass} disabled:cursor-not-allowed disabled:opacity-50`}
            />
            {field.description && (
              <p className="mt-2 text-xs text-ops-gray">{field.description}</p>
            )}
          </CardContent>
        </Card>
      );

    case 'select':
      return (
        <Card>
          <CardContent className="pt-6">
            {fieldLabel}
            <select disabled className={`${baseInputClass} disabled:cursor-not-allowed disabled:opacity-50`}>
              <option>Select an option</option>
              {field.options?.map((option) => (
                <option key={option.value}>{option.label}</option>
              ))}
            </select>
            {field.description && (
              <p className="mt-2 text-xs text-ops-gray">{field.description}</p>
            )}
          </CardContent>
        </Card>
      );

    case 'radio':
      return (
        <Card>
          <CardContent className="pt-6">
            {fieldLabel}
            <div className="space-y-2">
              {field.options?.map((option) => (
                <label key={option.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    disabled
                    className="disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <span className="text-sm text-neutral-200">{option.label}</span>
                </label>
              ))}
            </div>
            {field.description && (
              <p className="mt-2 text-xs text-ops-gray">{field.description}</p>
            )}
          </CardContent>
        </Card>
      );

    case 'checkbox':
      return (
        <Card>
          <CardContent className="pt-6">
            {fieldLabel}
            <div className="space-y-2">
              {field.options?.map((option) => (
                <label key={option.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    disabled
                    className="disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <span className="text-sm text-neutral-200">{option.label}</span>
                </label>
              ))}
            </div>
            {field.description && (
              <p className="mt-2 text-xs text-ops-gray">{field.description}</p>
            )}
          </CardContent>
        </Card>
      );

    case 'date':
      return (
        <Card>
          <CardContent className="pt-6">
            {fieldLabel}
            <input
              type="date"
              disabled
              className={`${baseInputClass} disabled:cursor-not-allowed disabled:opacity-50`}
            />
            {field.description && (
              <p className="mt-2 text-xs text-ops-gray">{field.description}</p>
            )}
          </CardContent>
        </Card>
      );

    case 'file':
      return (
        <Card>
          <CardContent className="pt-6">
            {fieldLabel}
            <input
              type="file"
              disabled
              className={`${baseInputClass} disabled:cursor-not-allowed disabled:opacity-50`}
            />
            {field.description && (
              <p className="mt-2 text-xs text-ops-gray">{field.description}</p>
            )}
          </CardContent>
        </Card>
      );

    default:
      return null;
  }
}
