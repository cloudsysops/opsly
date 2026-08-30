"use client";

import { FormField, FormFieldValue } from "@/lib/types/form-schema";

interface RadioFieldProps {
  field: FormField;
  value: FormFieldValue | undefined;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
}

export function RadioField({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
}: RadioFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && (
        <p className="text-sm text-gray-500">{field.description}</p>
      )}
      <div className="space-y-2">
        {field.options?.map((option) => (
          <label
            key={option.value}
            className={`
              flex items-center gap-3 p-3 border rounded-lg cursor-pointer
              transition-colors
              ${
                value === option.value
                  ? "border-brand-purple bg-brand-purple/5"
                  : "border-gray-200 hover:border-gray-300"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            <input
              type="radio"
              name={field.name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
              disabled={disabled}
              className="w-4 h-4 text-brand-purple focus:ring-brand-purple"
            />
            <span className="text-sm text-gray-700">{option.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
