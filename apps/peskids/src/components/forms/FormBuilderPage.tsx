'use client';

import React, { useState } from 'react';
import { FormBuilder } from './FormBuilder';
import { FormPreview } from './FormPreview';
import type { Form } from '../../../lib/form-types';

interface FormBuilderPageProps {
  tenantSlug: string;
  initialForm?: Form;
}

export function FormBuilderPage({
  tenantSlug,
  initialForm,
}: FormBuilderPageProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [formData, setFormData] = useState<Form>(
    initialForm || {
      id: '',
      tenantSlug,
      title: 'New Form',
      description: '',
      fields: [],
      settings: {
        successMessage: 'Thank you for your submission!',
      },
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );

  const handleSaveForm = async (nextForm: Form = formData) => {
    try {
      const response = await fetch(`/api/peskids/portal/${tenantSlug}/forms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nextForm),
      });

      if (!response.ok) {
        throw new Error('Failed to save form');
      }

      const result = await response.json();
      alert('Form saved successfully!');
      setFormData((prev) => ({ ...prev, id: result.id }));
    } catch (error) {
      console.error('Error saving form:', error);
      alert('Failed to save form. Please try again.');
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-100">{formData.title}</h1>
          <p className="mt-2 text-sm text-ops-gray">
            {formData.fields.length} field{formData.fields.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => handleSaveForm()}
          className="rounded-lg bg-ops-green px-6 py-2 font-medium text-neutral-100 hover:bg-ops-green/90 transition"
        >
          Save Form
        </button>
      </div>

      <div className="flex gap-2 border-b border-ops-border">
        <button
          type="button"
          onClick={() => setActiveTab('editor')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'editor'
              ? 'border-b-2 border-ops-blue text-ops-blue'
              : 'text-ops-gray hover:text-neutral-200'
          }`}
        >
          Editor
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'preview'
              ? 'border-b-2 border-ops-blue text-ops-blue'
              : 'text-ops-gray hover:text-neutral-200'
          }`}
        >
          Preview
        </button>
      </div>

      <div className="py-6">
        {activeTab === 'editor' ? (
          <FormBuilder form={formData} onSave={handleSaveForm} />
        ) : (
          <FormPreview form={formData} />
        )}
      </div>
    </div>
  );
}
