'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormField, FieldType } from '@/lib/form-types';

interface FormBuilderProps {
  form?: Form;
  onSave?: (form: Form) => Promise<void>;
  isLoading?: boolean;
}

const FIELD_TYPES: { value: FieldType; label: string; icon: string }[] = [
  { value: 'text', label: 'Text Input', icon: '📝' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'phone', label: 'Phone', icon: '📱' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'textarea', label: 'Long Text', icon: '📄' },
  { value: 'select', label: 'Dropdown', icon: '▼' },
  { value: 'checkbox', label: 'Checkbox', icon: '☑️' },
  { value: 'radio', label: 'Radio Buttons', icon: '◯' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'file', label: 'File Upload', icon: '📎' },
];

export function FormBuilder({ form, onSave, isLoading = false }: FormBuilderProps) {
  const [formData, setFormData] = useState<Form>(
    form || {
      id: '',
      tenantSlug: 'peskids',
      title: 'Untitled Form',
      description: '',
      fields: [],
      settings: {
        showProgressBar: false,
        requiresAuth: false,
      },
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [showFieldOptions, setShowFieldOptions] = useState(false);

  const addField = useCallback((fieldType: FieldType) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: fieldType,
      label: `New ${fieldType} field`,
      required: false,
      options: ['select', 'radio', 'checkbox'].includes(fieldType)
        ? [{ value: 'option1', label: 'Option 1' }]
        : undefined,
    };

    setFormData((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));

    setShowFieldOptions(false);
  }, []);

  const removeField = useCallback((fieldId: string) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== fieldId),
    }));
    setSelectedFieldId(null);
  }, []);

  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (onSave) {
      try {
        await onSave({
          ...formData,
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to save form:', error);
      }
    }
  }, [formData, onSave]);

  return (
    <div className="w-full space-y-6 bg-ops-bg p-6">
      {/* Form Header */}
      <Card>
        <CardHeader>
          <CardTitle>Form Settings</CardTitle>
          <CardDescription>Configure basic form properties</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-200">
              Form Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full rounded border border-ops-border bg-ops-surface px-3 py-2 text-neutral-100"
              placeholder="Enter form title"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-200">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full rounded border border-ops-border bg-ops-surface px-3 py-2 text-neutral-100"
              placeholder="Enter form description"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.settings.showProgressBar}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, showProgressBar: e.target.checked },
                  }))
                }
                className="rounded border-ops-border"
              />
              <span className="text-sm text-neutral-200">Show Progress Bar</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Fields Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-100">Form Fields</h2>
          <Button
            onClick={() => setShowFieldOptions(!showFieldOptions)}
            className="bg-ops-blue hover:bg-ops-blue/90"
            size="sm"
          >
            + Add Field
          </Button>
        </div>

        {showFieldOptions && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {FIELD_TYPES.map((fieldType) => (
                  <button
                    key={fieldType.value}
                    onClick={() => addField(fieldType.value)}
                    className="flex flex-col items-center gap-2 rounded border border-ops-border p-3 transition hover:bg-ops-surface"
                  >
                    <span className="text-2xl">{fieldType.icon}</span>
                    <span className="text-xs font-medium text-neutral-200">{fieldType.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {formData.fields.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-ops-gray">No fields yet. Add a field to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {formData.fields.map((field) => (
              <Card
                key={field.id}
                className={`cursor-pointer transition ${
                  selectedFieldId === field.id
                    ? 'border-ops-blue bg-ops-surface'
                    : 'hover:border-ops-border/80'
                }`}
                onClick={() => setSelectedFieldId(field.id)}
              >
                <CardContent className="flex items-start justify-between p-4">
                  <div className="flex-1">
                    <div className="font-medium text-neutral-100">{field.label}</div>
                    <div className="text-xs text-ops-gray">
                      {field.type}
                      {field.required && ' • Required'}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeField(field.id);
                    }}
                    className="text-ops-gray hover:text-ops-red"
                  >
                    ✕
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Field Editor */}
      {selectedFieldId && (
        <FieldEditor
          field={formData.fields.find((f) => f.id === selectedFieldId)!}
          onUpdate={(updates) => updateField(selectedFieldId, updates)}
        />
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 border-t border-ops-border pt-6">
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="flex-1 bg-ops-green hover:bg-ops-green/90"
        >
          {isLoading ? 'Saving...' : 'Save Form'}
        </Button>
      </div>
    </div>
  );
}

interface FieldEditorProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
}

function FieldEditor({ field, onUpdate }: FieldEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Edit Field</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-200">Label</label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="w-full rounded border border-ops-border bg-ops-surface px-3 py-2 text-neutral-100"
          />
        </div>

        {field.type === 'textarea' || field.type === 'text' ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-200">
              Placeholder
            </label>
            <input
              type="text"
              value={field.placeholder || ''}
              onChange={(e) => onUpdate({ placeholder: e.target.value })}
              className="w-full rounded border border-ops-border bg-ops-surface px-3 py-2 text-neutral-100"
            />
          </div>
        ) : null}

        {['select', 'radio', 'checkbox'].includes(field.type) && field.options ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-200">Options</label>
            <div className="space-y-2">
              {field.options.map((option, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={option.label}
                    onChange={(e) => {
                      const newOptions = [...field.options!];
                      newOptions[idx].label = e.target.value;
                      onUpdate({ options: newOptions });
                    }}
                    className="flex-1 rounded border border-ops-border bg-ops-surface px-3 py-2 text-neutral-100"
                    placeholder="Option label"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="rounded border-ops-border"
          />
          <span className="text-sm text-neutral-200">Required field</span>
        </label>
      </CardContent>
    </Card>
  );
}
