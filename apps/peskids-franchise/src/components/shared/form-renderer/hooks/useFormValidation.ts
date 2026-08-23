"use client";

import { useCallback, useState } from "react";
import { FormSchema, FormField, FormFieldValue, FormSubmissionData, ValidationRule } from "@/lib/types/form-schema";

interface UseFormValidationResult {
  errors: Record<string, string>;
  validateField: (field: FormField, value: FormFieldValue | undefined) => string | null;
  validateAll: (schema: FormSchema, values: FormSubmissionData) => boolean;
  setFieldError: (fieldName: string, error: string | null) => void;
  clearErrors: () => void;
}

export function useFormValidation(): UseFormValidationResult {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = useCallback(
    (field: FormField, value: FormFieldValue | undefined): string | null => {
      // Skip validation for non-input fields
      if (["section-header", "info-box"].includes(field.type)) {
        return null;
      }

      // Check required
      if (field.required) {
        if (
          value === undefined ||
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0)
        ) {
          return `${field.label} is required`;
        }
      }

      // Skip further validation if empty and not required
      if (value === undefined || value === null || value === "") {
        return null;
      }

      // Run validation rules
      if (field.validation) {
        for (const rule of field.validation) {
          const error = runValidationRule(rule, value, field.label);
          if (error) {
            return error;
          }
        }
      }

      // Type-specific validations
      switch (field.type) {
        case "repeatable-group":
          if (Array.isArray(value)) {
            if (field.min !== undefined && value.length < field.min) {
              return `Minimum ${field.min} ${field.min === 1 ? "entry" : "entries"} required`;
            }
            if (field.max !== undefined && value.length > field.max) {
              return `Maximum ${field.max} ${field.max === 1 ? "entry" : "entries"} allowed`;
            }
          }
          break;
        case "file":
          // File validation would be handled separately
          break;
      }

      return null;
    },
    []
  );

  const validateAll = useCallback(
    (schema: FormSchema, values: FormSubmissionData): boolean => {
      const newErrors: Record<string, string> = {};
      let isValid = true;

      const validateFieldsRecursive = (fields: FormField[], prefix = "") => {
        for (const field of fields) {
          const fieldName = prefix ? `${prefix}.${field.name}` : field.name;
          const value = values[fieldName];
          const error = validateField(field, value);

          if (error) {
            newErrors[fieldName] = error;
            isValid = false;
          }

          // Validate nested fields in repeatable groups
          if (field.type === "repeatable-group" && field.fields && Array.isArray(value)) {
            value.forEach((entry, index) => {
              if (typeof entry === "object" && entry !== null) {
                for (const nestedField of field.fields!) {
                  const nestedFieldName = `${fieldName}.${index}.${nestedField.name}`;
                  const nestedValue = (entry as Record<string, FormFieldValue>)[nestedField.name];
                  const nestedError = validateField(nestedField, nestedValue);
                  if (nestedError) {
                    newErrors[nestedFieldName] = nestedError;
                    isValid = false;
                  }
                }
              }
            });
          }
        }
      };

      validateFieldsRecursive(schema.fields);
      setErrors(newErrors);
      return isValid;
    },
    [validateField]
  );

  const setFieldError = useCallback((fieldName: string, error: string | null) => {
    setErrors((prev) => {
      if (error === null) {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      }
      return { ...prev, [fieldName]: error };
    });
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    validateField,
    validateAll,
    setFieldError,
    clearErrors,
  };
}

// Helper function to run a single validation rule
function runValidationRule(
  rule: ValidationRule,
  value: FormFieldValue,
  fieldLabel: string
): string | null {
  switch (rule.type) {
    case "required":
      if (!value || (Array.isArray(value) && value.length === 0)) {
        return rule.message || `${fieldLabel} is required`;
      }
      break;

    case "minLength":
      if (typeof value === "string" && value.length < (rule.value as number)) {
        return rule.message || `${fieldLabel} must be at least ${rule.value} characters`;
      }
      break;

    case "maxLength":
      if (typeof value === "string" && value.length > (rule.value as number)) {
        return rule.message || `${fieldLabel} must be no more than ${rule.value} characters`;
      }
      break;

    case "min":
      if (typeof value === "number" && value < (rule.value as number)) {
        return rule.message || `${fieldLabel} must be at least ${rule.value}`;
      }
      break;

    case "max":
      if (typeof value === "number" && value > (rule.value as number)) {
        return rule.message || `${fieldLabel} must be no more than ${rule.value}`;
      }
      break;

    case "pattern":
      if (typeof value === "string" && !new RegExp(rule.value as string).test(value)) {
        return rule.message || `${fieldLabel} format is invalid`;
      }
      break;

    case "email":
      if (typeof value === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return rule.message || "Please enter a valid email address";
      }
      break;

    case "url":
      if (typeof value === "string") {
        try {
          new URL(value);
        } catch {
          return rule.message || "Please enter a valid URL";
        }
      }
      break;

    case "phone":
      if (typeof value === "string") {
        const cleaned = value.replace(/\s/g, "");
        if (!/^[\d\-\+\(\)]{10,20}$/.test(cleaned)) {
          return rule.message || "Please enter a valid phone number";
        }
      }
      break;
  }

  return null;
}

// Export for external use
export { runValidationRule };
