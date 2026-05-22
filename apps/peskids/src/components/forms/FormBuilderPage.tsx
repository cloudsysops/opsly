'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@intcloudsysops/components';
import { FormBuilder } from './FormBuilder';
import { FormPreview } from './FormPreview';
import type { Form } from '../../lib/form-types';

interface FormBuilderPageProps {
  tenantSlug: string;
  formId?: string;
  initialForm?: Form;
}

export function FormBuilderPage({
  tenantSlug,
  formId,
  initialForm,
}: FormBuilderPageProps) {
  const [formData, setFormData] = useState<Form>(
    initialForm || {
      id: '',
      title: 'New Form',
      description: '',
      fields: [],
      settings: {
        successMessage: 'Thank you for your submission!',
      },
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );

  const handleSaveForm = async () => {
    try {
      const response = await fetch(`/api/peskids/portal/${tenantSlug}/forms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save form');
      }

      const result = await response.json();
      alert('Form saved successfully!');
      setFormData((prev) => ({
        ...prev,
        id: result.id,
      }));
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
          onClick={handleSaveForm}
          className="rounded-lg bg-ops-green px-6 py-2 font-medium text-neutral-100 hover:bg-ops-green/90 transition"
        >
          Save Form
        </button>
      </div>

      <Tabs defaultValue="editor" className="w-full">
        <TabsList className="border-b border-ops-border">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="py-6">
          <FormBuilder
            form={formData}
            onChange={setFormData}
          />
        </TabsContent>

        <TabsContent value="preview" className="py-6">
          <FormPreview form={formData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
