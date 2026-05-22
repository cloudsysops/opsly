// Form builder and submission type definitions

export type FieldType = 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'file';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: { value: string; label: string }[]; // for select, radio
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    errorMessage?: string;
  };
}

export interface Form {
  id: string;
  tenantSlug: string;
  title: string;
  description?: string;
  fields: FormField[];
  settings: {
    successMessage?: string;
    successUrl?: string;
    showProgressBar?: boolean;
    requiresAuth?: boolean;
  };
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
  submissionCount?: number;
}

export interface FormSubmission {
  id: string;
  formId: string;
  tenantSlug: string;
  data: Record<string, unknown>;
  submittedAt: string;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
}

export interface FormPage {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  order: number;
}
