"use client";

import { useState, useCallback } from "react";
import { FormSchema, FormField, FormFieldValue, FormSubmissionData } from "@/lib/types/form-schema";

interface UseFormSchemaResult {
  values: FormSubmissionData;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  setValue: (fieldName: string, value: FormFieldValue) => void;
  setTouched: (fieldName: string) => void;
  validate: () => boolean;
  reset: (initialValues?: FormSubmissionData) => void;
  getFieldValue: (fieldName: string) => FormFieldValue | undefined;
}

export function useFormSchema(
  schema: FormSchema,
  initialValues: FormSubmissionData = {}
): UseFormSchemaResult {
  const [values, setValues] = useState<FormSubmissionData>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouchedState] = useState<Record<string, boolean>>({});

  const setValue = useCallback((fieldName: string, value: FormFieldValue) => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
    // Clear error when value changes
    setErrors((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

  const setTouched = useCallback((fieldName: string) => {
    setTouchedState((prev) => ({ ...prev, [fieldName]: true }));
  }, []);

  const getFieldValue = useCallback(
    (fieldName: string): FormFieldValue | undefined => {
      return values[fieldName];
    },
    [values]
  );

  const validateField = useCallback(
    (field: FormField, value: FormFieldValue | undefined): string | null => {
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

      // Skip validation if empty and not required
      if (value === undefined || value === null || value === "") {
        return null;
      }

      // Run validation rules
      if (field.validation) {
        for (const rule of field.validation) {
          switch (rule.type) {
            case "minLength":
              if (typeof value === "string" && value.length < (rule.value as number)) {
                return rule.message;
              }
              break;
            case "maxLength":
              if (typeof value === "string" && value.length > (rule.value as number)) {
                return rule.message;
              }
              break;
            case "min":
              if (typeof value === "number" && value < (rule.value as number)) {
                return rule.message;
              }
              break;
            case "max":
              if (typeof value === "number" && value > (rule.value as number)) {
                return rule.message;
              }
              break;
            case "pattern":
              if (typeof value === "string" && !new RegExp(rule.value as string).test(value)) {
                return rule.message;
              }
              break;
            case "email":
              if (typeof value === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                return rule.message;
              }
              break;
            case "url":
              if (typeof value === "string") {
                try {
                  new URL(value);
                } catch {
                  return rule.message;
                }
              }
              break;
            case "phone":
              if (
                typeof value === "string" &&
                !/^[\d\s\-\+\(\)]{10,20}$/.test(value.replace(/\s/g, ""))
              ) {
                return rule.message;
              }
              break;
          }
        }
      }

      // Repeatable group min/max
      if (field.type === "repeatable-group" && Array.isArray(value)) {
        if (field.min !== undefined && value.length < field.min) {
          return `Minimum ${field.min} entries required`;
        }
        if (field.max !== undefined && value.length > field.max) {
          return `Maximum ${field.max} entries allowed`;
        }
      }

      return null;
    },
    []
  );

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    const validateFields = (fields: FormField[], prefix = "") => {
      for (const field of fields) {
        // Skip non-input fields
        if (["section-header", "info-box"].includes(field.type)) {
          continue;
        }

        const fieldName = prefix ? `${prefix}.${field.name}` : field.name;
        const value = values[fieldName];
        const error = validateField(field, value);

        if (error) {
          newErrors[fieldName] = error;
          isValid = false;
        }

        // For repeatable groups, validate nested fields
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

    validateFields(schema.fields);
    setErrors(newErrors);
    return isValid;
  }, [schema.fields, values, validateField]);

  const reset = useCallback((initialVals: FormSubmissionData = {}) => {
    setValues(initialVals);
    setErrors({});
    setTouchedState({});
  }, []);

  return {
    values,
    errors,
    touched,
    setValue,
    setTouched,
    validate,
    reset,
    getFieldValue,
  };
}
