import { z } from 'zod';

export type ValidationRule =
  | { type: 'required'; message?: string }
  | { type: 'minLength'; value: number; message?: string }
  | { type: 'maxLength'; value: number; message?: string }
  | { type: 'pattern'; value: string; message?: string }
  | { type: 'email'; message?: string }
  | { type: 'url'; message?: string }
  | { type: 'number'; message?: string }
  | { type: 'min'; value: number; message?: string }
  | { type: 'max'; value: number; message?: string };

export interface ValidationConfig {
  rules: ValidationRule[];
}

export function createFieldValidator(fieldType: string, config?: ValidationConfig) {
  let schema: z.ZodTypeAny;

  // Start with base type
  switch (fieldType) {
    case 'email':
      schema = z.string().email('Invalid email address');
      break;
    case 'url':
      schema = z.string().url('Invalid URL');
      break;
    case 'number':
      schema = z.coerce.number();
      break;
    case 'date':
      schema = z.string().datetime('Invalid date format');
      break;
    case 'checkbox':
      schema = z.boolean();
      break;
    default:
      schema = z.string();
  }

  // Apply additional rules if provided
  if (config?.rules) {
    for (const rule of config.rules) {
      switch (rule.type) {
        case 'required':
          if (fieldType === 'checkbox') {
            schema = z.boolean().refine((val) => val === true, {
              message: rule.message || 'This field is required',
            });
          } else if (fieldType === 'number') {
            schema = z.coerce.number().refine((val) => !isNaN(val), {
              message: rule.message || 'This field is required',
            });
          } else {
            schema = z.string().min(1, rule.message || 'This field is required');
          }
          break;
        case 'minLength':
          schema = schema instanceof z.ZodString
            ? schema.min(rule.value, rule.message || `Minimum ${rule.value} characters required`)
            : schema;
          break;
        case 'maxLength':
          schema = schema instanceof z.ZodString
            ? schema.max(rule.value, rule.message || `Maximum ${rule.value} characters allowed`)
            : schema;
          break;
        case 'pattern':
          schema = schema instanceof z.ZodString
            ? schema.regex(new RegExp(rule.value), rule.message || 'Invalid format')
            : schema;
          break;
        case 'email':
          schema = schema instanceof z.ZodString
            ? schema.email(rule.message || 'Invalid email address')
            : schema;
          break;
        case 'url':
          schema = schema instanceof z.ZodString
            ? schema.url(rule.message || 'Invalid URL')
            : schema;
          break;
        case 'number':
          schema = z.coerce.number();
          break;
        case 'min':
          schema = schema instanceof z.ZodNumber
            ? schema.min(rule.value, rule.message || `Minimum value is ${rule.value}`)
            : schema;
          break;
        case 'max':
          schema = schema instanceof z.ZodNumber
            ? schema.max(rule.value, rule.message || `Maximum value is ${rule.value}`)
            : schema;
          break;
      }
    }
  }

  return schema;
}

export function validateFormData(
  fields: Array<{ id: string; type: string; required: boolean; validation?: ValidationConfig }>,
  data: Record<string, any>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = data[field.id];
    const config: ValidationConfig = {
      rules: [
        ...(field.required ? [{ type: 'required' as const }] : []),
        ...(field.validation?.rules || []),
      ],
    };

    try {
      const validator = createFieldValidator(field.type, config);
      validator.parse(value);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors[field.id] = error.errors[0]?.message || 'Invalid value';
      } else {
        errors[field.id] = 'Validation failed';
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// Common validation patterns
export const VALIDATION_PATTERNS = {
  PHONE: '^[+]?[(]?[0-9]{3}[)]?[-\\s.]?[0-9]{3}[-\\s.]?[0-9]{4,6}$',
  ZIPCODE: '^[0-9]{5}(?:-[0-9]{4})?$',
  SSN: '^[0-9]{3}-[0-9]{2}-[0-9]{4}$',
  CREDIT_CARD: '^[0-9]{13,19}$',
  ALPHANUMERIC: '^[a-zA-Z0-9]+$',
  SLUG: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  UPPERCASE: '^[A-Z]+$',
  LOWERCASE: '^[a-z]+$',
  HEX_COLOR: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
  IPV4: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
};
