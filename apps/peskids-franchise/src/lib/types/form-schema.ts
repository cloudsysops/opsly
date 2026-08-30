// Form Schema Types for Pre-Work CMS
// These types define the structure of dynamic form schemas stored in the database

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "phone"
  | "url"
  | "date"
  | "select"
  | "radio"
  | "checkbox"
  | "checkbox-group"
  | "file"
  | "repeatable-group"
  | "section-header"
  | "info-box";

export interface SelectOption {
  value: string;
  label: string;
}

export interface ValidationRule {
  type:
    | "required"
    | "minLength"
    | "maxLength"
    | "min"
    | "max"
    | "pattern"
    | "email"
    | "url"
    | "phone"
    | "custom";
  value?: string | number;
  message: string;
}

export interface ConditionalRule {
  field: string; // ID of the field to check
  operator: "equals" | "notEquals" | "contains" | "notContains" | "isEmpty" | "isNotEmpty";
  value?: string | number | boolean;
  action: "show" | "hide" | "require" | "disable";
}

export interface FormField {
  id: string;
  type: FieldType;
  name: string; // Field name for form data
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  validation?: ValidationRule[];
  conditional?: ConditionalRule;

  // Type-specific properties
  options?: SelectOption[]; // select, radio, checkbox-group
  min?: number; // number (min value), repeatable-group (min entries)
  max?: number; // number (max value), repeatable-group (max entries)
  rows?: number; // textarea
  fields?: FormField[]; // repeatable-group nested fields
  accept?: string; // file (mime types)
  maxSize?: number; // file (in bytes)
  variant?: "info" | "warning" | "success"; // info-box
  defaultValue?: string | number | boolean;
}

export interface FormSchema {
  version: number;
  fields: FormField[];
}

// AI Suggestion Types
export type SuggestionType = "modify" | "add" | "remove" | "reorder";
export type SuggestionPriority = "high" | "medium" | "low";

export interface AISuggestion {
  id: string;
  type: SuggestionType;
  priority: SuggestionPriority;
  fieldId?: string; // For modify/remove
  reason: string;
  suggestedChanges?: Partial<FormField> | FormField; // For modify/add
  newPosition?: number; // For reorder
}

export interface AISuggestionSet {
  suggestions: AISuggestion[];
  analysisData: {
    totalSubmissions: number;
    completionRate: number;
    averageScore: number;
    commonRedFlags: string[];
    fieldCompletionRates: Record<string, number>;
  };
}

// Form Submission Value Types
export type FormFieldValue =
  | string
  | number
  | boolean
  | string[]
  | RepeatableGroupEntry[];

export interface RepeatableGroupEntry {
  id: string;
  [fieldName: string]: FormFieldValue;
}

export interface FormSubmissionData {
  [fieldName: string]: FormFieldValue;
}

// Helper type guards
export function isRepeatableGroupField(field: FormField): boolean {
  return field.type === "repeatable-group";
}

export function hasOptions(field: FormField): boolean {
  return ["select", "radio", "checkbox-group"].includes(field.type);
}

export function isTextInputField(field: FormField): boolean {
  return ["text", "textarea", "email", "phone", "url"].includes(field.type);
}

// Default field configurations by type
export const defaultFieldConfig: Record<FieldType, Partial<FormField>> = {
  text: { placeholder: "Enter text..." },
  textarea: { rows: 4, placeholder: "Enter your response..." },
  number: { min: 0 },
  email: {
    placeholder: "email@example.com",
    validation: [{ type: "email", message: "Please enter a valid email address" }],
  },
  phone: {
    placeholder: "(555) 123-4567",
    validation: [{ type: "phone", message: "Please enter a valid phone number" }],
  },
  url: {
    placeholder: "https://example.com",
    validation: [{ type: "url", message: "Please enter a valid URL" }],
  },
  date: {},
  select: { options: [] },
  radio: { options: [] },
  checkbox: {},
  "checkbox-group": { options: [] },
  file: { accept: ".pdf,.doc,.docx,.txt", maxSize: 10 * 1024 * 1024 }, // 10MB
  "repeatable-group": { min: 1, max: 20, fields: [] },
  "section-header": {},
  "info-box": { variant: "info" },
};

// Generate a unique field ID
export function generateFieldId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create a new field with defaults
export function createField(type: FieldType, overrides: Partial<FormField> = {}): FormField {
  const defaults = defaultFieldConfig[type] || {};
  return {
    id: generateFieldId(),
    type,
    name: `field_${Date.now()}`,
    label: "New Field",
    ...defaults,
    ...overrides,
  };
}
