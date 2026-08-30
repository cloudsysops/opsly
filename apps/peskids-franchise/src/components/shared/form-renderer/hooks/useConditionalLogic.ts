"use client";

import { useCallback, useMemo } from "react";
import { FormField, ConditionalRule, FormFieldValue, FormSubmissionData } from "@/lib/types/form-schema";

interface ConditionalState {
  visible: boolean;
  required: boolean;
  disabled: boolean;
}

interface UseConditionalLogicResult {
  getFieldState: (field: FormField) => ConditionalState;
  evaluateCondition: (rule: ConditionalRule) => boolean;
}

export function useConditionalLogic(
  values: FormSubmissionData
): UseConditionalLogicResult {
  const evaluateCondition = useCallback(
    (rule: ConditionalRule): boolean => {
      const fieldValue = values[rule.field];

      switch (rule.operator) {
        case "equals":
          return fieldValue === rule.value;
        case "notEquals":
          return fieldValue !== rule.value;
        case "contains":
          if (typeof fieldValue === "string") {
            return fieldValue.includes(String(rule.value));
          }
          if (Array.isArray(fieldValue)) {
            // For string arrays (e.g., checkbox values)
            return (fieldValue as unknown[]).some(v => v === rule.value);
          }
          return false;
        case "notContains":
          if (typeof fieldValue === "string") {
            return !fieldValue.includes(String(rule.value));
          }
          if (Array.isArray(fieldValue)) {
            // For string arrays (e.g., checkbox values)
            return !(fieldValue as unknown[]).some(v => v === rule.value);
          }
          return true;
        case "isEmpty":
          return (
            fieldValue === undefined ||
            fieldValue === null ||
            fieldValue === "" ||
            (Array.isArray(fieldValue) && fieldValue.length === 0)
          );
        case "isNotEmpty":
          return (
            fieldValue !== undefined &&
            fieldValue !== null &&
            fieldValue !== "" &&
            (!Array.isArray(fieldValue) || fieldValue.length > 0)
          );
        default:
          return true;
      }
    },
    [values]
  );

  const getFieldState = useCallback(
    (field: FormField): ConditionalState => {
      const defaultState: ConditionalState = {
        visible: true,
        required: field.required || false,
        disabled: false,
      };

      if (!field.conditional) {
        return defaultState;
      }

      const conditionMet = evaluateCondition(field.conditional);

      switch (field.conditional.action) {
        case "show":
          return {
            ...defaultState,
            visible: conditionMet,
          };
        case "hide":
          return {
            ...defaultState,
            visible: !conditionMet,
          };
        case "require":
          return {
            ...defaultState,
            required: conditionMet,
          };
        case "disable":
          return {
            ...defaultState,
            disabled: conditionMet,
          };
        default:
          return defaultState;
      }
    },
    [evaluateCondition]
  );

  return {
    getFieldState,
    evaluateCondition,
  };
}

// Helper to flatten all fields including nested ones for validation
export function flattenFields(fields: FormField[]): FormField[] {
  const result: FormField[] = [];

  for (const field of fields) {
    result.push(field);
    if (field.type === "repeatable-group" && field.fields) {
      result.push(...flattenFields(field.fields));
    }
  }

  return result;
}
