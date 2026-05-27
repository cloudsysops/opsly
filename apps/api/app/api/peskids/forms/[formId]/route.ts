import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api-response';
import { HTTP_STATUS } from '@/lib/constants';
import { getServiceClient } from '@/lib/supabase';

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: { value: string; label: string }[];
}

interface DBFormField {
  field_id: string;
  field_type: string;
  label: string;
  required: boolean;
  options?: { value: string; label: string }[];
  order: number;
}

interface Form {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  settings: {
    successMessage: string;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
): Promise<Response> {
  try {
    const { formId } = await params;

    if (!formId) {
      return jsonError('Missing form ID', HTTP_STATUS.BAD_REQUEST);
    }

    const supabase = getServiceClient();

    // Get form
    const { data: form, error: formError } = await supabase
      .schema('peskids').from('forms')
      .select('id, form_id, tenant_slug, title, description, status, created_at, updated_at')
      .eq('form_id', formId)
      .single();

    if (formError || !form) {
      return jsonError('Form not found', HTTP_STATUS.NOT_FOUND);
    }

    // Get form fields
    const { data: fields, error: fieldsError } = await supabase
      .schema('peskids').from('form_fields')
      .select('field_id, field_type, label, required, options, order')
      .eq('form_id', formId)
      .order('order', { ascending: true });

    if (fieldsError) {
      console.error('Failed to fetch form fields:', fieldsError);
      return jsonError('Failed to fetch form', HTTP_STATUS.INTERNAL_ERROR);
    }

    const formData: Form = {
      id: form.id,
      title: form.title,
      description: form.description || '',
      fields: (fields || []).map((field: DBFormField) => ({
        id: field.field_id,
        type: field.field_type,
        label: field.label,
        required: field.required,
        options: field.options,
      })),
      settings: {
        successMessage: 'Thank you for your submission!',
      },
      status: form.status,
      createdAt: form.created_at,
      updatedAt: form.updated_at,
    };

    return jsonOk(formData);
  } catch (error) {
    console.error('Form retrieval error:', error);
    return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
  }
}
