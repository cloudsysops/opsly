"use client";

import { FormField, FormFieldValue } from "@/lib/types/form-schema";

interface CheckboxFieldProps {
  field: FormField;
  value: FormFieldValue | undefined;
  onChange: (value: boolean) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
}

export function CheckboxField({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
}: CheckboxFieldProps) {
  return (
    <div className="space-y-1">
      <label
        className={`
          flex items-start gap-3 cursor-pointer
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input
          type="checkbox"
          id={field.id}
          name={field.name}
          checked={(value as boolean) || false}
          onChange={(e) => onChange(e.target.checked)}
          onBlur={onBlur}
          disabled={disabled}
          className="mt-1 w-4 h-4 text-brand-purple rounded focus:ring-brand-purple"
        />
        <div>
          <span className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </span>
          {field.description && (
            <p className="text-sm text-gray-500">{field.description}</p>
          )}
        </div>
      </label>
      {error && <p className="text-sm text-red-600 ml-7">{error}</p>}
    </div>
  );
}
