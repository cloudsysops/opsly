import type { FieldType, Form, FormField } from '@/lib/form-types';
import { supabaseServer } from '@/lib/supabase';
import type { Json } from '@/lib/types';

const FIELD_TYPES = new Set<FieldType>([
  'text',
  'email',
  'phone',
  'number',
  'textarea',
  'select',
  'checkbox',
  'radio',
  'date',
  'file',
]);

interface FormRow {
  id: string;
  form_id: string;
  title: string;
  description: string | null;
  settings: Json | null;
  status: 'active' | 'archived';
  created_at: string | null;
  updated_at: string | null;
}

interface FormFieldRow {
  field_id: string;
  field_type: string;
  label: string;
  placeholder: string | null;
  required: boolean | null;
  options: Json | null;
  validation: Json | null;
  order_index: number;
}

export interface ActiveFormSummary {
  id: string;
  title: string;
  description?: string;
}

function objectValue(value: Json | null): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function fieldType(value: string): FieldType {
  return FIELD_TYPES.has(value as FieldType) ? (value as FieldType) : 'text';
}

function mapOptions(value: Json | null): FormField['options'] {
  if (!Array.isArray(value)) return undefined;

  return value.flatMap((option) => {
    if (!option || typeof option !== 'object' || Array.isArray(option)) return [];
    const record = option as Record<string, unknown>;
    return typeof record.value === 'string' && typeof record.label === 'string'
      ? [{ value: record.value, label: record.label }]
      : [];
  });
}

function mapValidation(value: Json | null): FormField['validation'] {
  const record = objectValue(value);
  const validation: NonNullable<FormField['validation']> = {};

  if (typeof record.minLength === 'number') validation.minLength = record.minLength;
  if (typeof record.maxLength === 'number') validation.maxLength = record.maxLength;
  if (typeof record.pattern === 'string') validation.pattern = record.pattern;
  if (typeof record.errorMessage === 'string') validation.errorMessage = record.errorMessage;

  return Object.keys(validation).length > 0 ? validation : undefined;
}

function mapSettings(value: Json | null): Form['settings'] {
  const record = objectValue(value);
  return {
    successMessage: typeof record.successMessage === 'string' ? record.successMessage : undefined,
    successUrl: typeof record.successUrl === 'string' ? record.successUrl : undefined,
    showProgressBar:
      typeof record.showProgressBar === 'boolean' ? record.showProgressBar : undefined,
    requiresAuth: true,
  };
}

export async function listActiveFamilyForms(tenantSlug: string): Promise<ActiveFormSummary[]> {
  const { data, error } = await supabaseServer()
    .schema('peskids')
    .from('forms')
    .select('form_id, title, description')
    .eq('tenant_slug', tenantSlug)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Unable to list active forms: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.form_id,
    title: row.title,
    description: row.description ?? undefined,
  }));
}

export async function getActiveFamilyForm(
  tenantSlug: string,
  publicFormId: string
): Promise<Form | null> {
  const client = supabaseServer().schema('peskids');
  const { data: form, error: formError } = await client
    .from('forms')
    .select('id, form_id, title, description, settings, status, created_at, updated_at')
    .eq('tenant_slug', tenantSlug)
    .eq('form_id', publicFormId)
    .eq('status', 'active')
    .maybeSingle();

  if (formError) {
    throw new Error(`Unable to load form: ${formError.message}`);
  }
  if (!form) return null;

  const { data: fields, error: fieldsError } = await client
    .from('form_fields')
    .select('field_id, field_type, label, placeholder, required, options, validation, order_index')
    .eq('form_id', form.id)
    .order('order_index', { ascending: true });

  if (fieldsError) {
    throw new Error(`Unable to load form fields: ${fieldsError.message}`);
  }

  const formRow = form as FormRow;
  return {
    id: formRow.form_id,
    tenantSlug,
    title: formRow.title,
    description: formRow.description ?? undefined,
    fields: ((fields ?? []) as FormFieldRow[]).map((field) => ({
      id: field.field_id,
      type: fieldType(field.field_type),
      label: field.label,
      placeholder: field.placeholder ?? undefined,
      required: field.required ?? false,
      options: mapOptions(field.options),
      validation: mapValidation(field.validation),
    })),
    settings: mapSettings(formRow.settings),
    status: 'published',
    createdAt: formRow.created_at ?? '',
    updatedAt: formRow.updated_at ?? '',
  };
}
