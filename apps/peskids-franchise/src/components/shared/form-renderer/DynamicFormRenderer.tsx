"use client";

import { useMemo } from "react";
import { FormSchema, FormField, FormFieldValue, FormSubmissionData } from "@/lib/types/form-schema";
import { useFormSchema } from "./hooks/useFormSchema";
import { useConditionalLogic } from "./hooks/useConditionalLogic";
import {
  TextField,
  TextareaField,
  NumberField,
  DateField,
  SelectField,
  RadioField,
  CheckboxField,
  CheckboxGroupField,
  FileField,
  RepeatableGroup,
  SectionHeader,
  InfoBox,
} from "./fields";

interface DynamicFormRendererProps {
  schema: FormSchema;
  initialValues?: FormSubmissionData;
  onChange?: (values: FormSubmissionData) => void;
  onSubmit?: (values: FormSubmissionData) => void;
  disabled?: boolean;
  className?: string;
  onFileUpload?: (file: File) => Promise<string>;
  submitLabel?: string;
  showSubmitButton?: boolean;
}

export function DynamicFormRenderer({
  schema,
  initialValues = {},
  onChange,
  onSubmit,
  disabled = false,
  className = "",
  onFileUpload,
  submitLabel = "Submit",
  showSubmitButton = true,
}: DynamicFormRendererProps) {
  const { values, errors, touched, setValue, setTouched, validate } = useFormSchema(
    schema,
    initialValues
  );
  const { getFieldState } = useConditionalLogic(values);

  // Notify parent of value changes
  useMemo(() => {
    onChange?.(values);
  }, [values, onChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit?.(values);
    }
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return touched[fieldName] ? errors[fieldName] : undefined;
  };

  const renderField = (
    field: FormField,
    fieldValue: FormFieldValue | undefined,
    fieldOnChange: (value: FormFieldValue) => void,
    fieldOnBlur: () => void,
    fieldError?: string,
    fieldDisabled?: boolean
  ): React.ReactNode => {
    const state = getFieldState(field);

    if (!state.visible) {
      return null;
    }

    const effectiveRequired = state.required;
    const effectiveDisabled = fieldDisabled || state.disabled || disabled;

    // Clone field with effective required state
    const effectiveField = { ...field, required: effectiveRequired };

    switch (field.type) {
      case "text":
      case "email":
      case "phone":
      case "url":
        return (
          <TextField
            field={effectiveField}
            value={fieldValue}
            onChange={(v) => fieldOnChange(v)}
            onBlur={fieldOnBlur}
            error={fieldError}
            disabled={effectiveDisabled}
          />
        );

      case "textarea":
        return (
          <TextareaField
            field={effectiveField}
            value={fieldValue}
            onChange={(v) => fieldOnChange(v)}
            onBlur={fieldOnBlur}
            error={fieldError}
            disabled={effectiveDisabled}
          />
        );

      case "number":
        return (
          <NumberField
            field={effectiveField}
            value={fieldValue}
            onChange={(v) => fieldOnChange(v)}
            onBlur={fieldOnBlur}
            error={fieldError}
            disabled={effectiveDisabled}
          />
        );

      case "date":
        return (
          <DateField
            field={effectiveField}
            value={fieldValue}
            onChange={(v) => fieldOnChange(v)}
            onBlur={fieldOnBlur}
            error={fieldError}
            disabled={effectiveDisabled}
          />
        );

      case "select":
        return (
          <SelectField
            field={effectiveField}
            value={fieldValue}
            onChange={(v) => fieldOnChange(v)}
            onBlur={fieldOnBlur}
            error={fieldError}
            disabled={effectiveDisabled}
          />
        );

      case "radio":
        return (
          <RadioField
            field={effectiveField}
            value={fieldValue}
            onChange={(v) => fieldOnChange(v)}
            onBlur={fieldOnBlur}
            error={fieldError}
            disabled={effectiveDisabled}
          />
        );

      case "checkbox":
        return (
          <CheckboxField
            field={effectiveField}
            value={fieldValue}
            onChange={(v) => fieldOnChange(v)}
            onBlur={fieldOnBlur}
            error={fieldError}
            disabled={effectiveDisabled}
          />
        );

      case "checkbox-group":
        return (
          <CheckboxGroupField
            field={effectiveField}
            value={fieldValue}
            onChange={(v) => fieldOnChange(v)}
            onBlur={fieldOnBlur}
            error={fieldError}
            disabled={effectiveDisabled}
          />
        );

      case "file":
        return (
          <FileField
            field={effectiveField}
            value={fieldValue}
            onChange={(v) => fieldOnChange(v)}
            onBlur={fieldOnBlur}
            error={fieldError}
            disabled={effectiveDisabled}
            onFileUpload={onFileUpload}
          />
        );

      case "repeatable-group":
        return (
          <RepeatableGroup
            field={effectiveField}
            value={fieldValue}
            onChange={(v) => fieldOnChange(v)}
            onBlur={fieldOnBlur}
            error={fieldError}
            disabled={effectiveDisabled}
            renderField={renderField}
            getFieldError={getFieldError}
          />
        );

      case "section-header":
        return <SectionHeader field={effectiveField} />;

      case "info-box":
        return <InfoBox field={effectiveField} />;

      default:
        console.warn(`Unknown field type: ${field.type}`);
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-6">
        {schema.fields.map((field) => {
          const state = getFieldState(field);
          if (!state.visible) return null;

          return (
            <div key={field.id}>
              {renderField(
                field,
                values[field.name],
                (value) => setValue(field.name, value),
                () => setTouched(field.name),
                getFieldError(field.name),
                disabled
              )}
            </div>
          );
        })}
      </div>

      {showSubmitButton && (
        <div className="mt-8">
          <button
            type="submit"
            disabled={disabled}
            className="w-full py-3 px-4 bg-brand-purple text-white font-medium rounded-lg
              hover:bg-brand-purple/90 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}

export default DynamicFormRenderer;
