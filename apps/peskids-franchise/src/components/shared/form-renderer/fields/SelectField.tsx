"use client";

import { FormField, FormFieldValue } from "@/lib/types/form-schema";

interface SelectFieldProps {
  field: FormField;
  value: FormFieldValue | undefined;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
}

export function SelectField({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
}: SelectFieldProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={field.id}
        className="block text-sm font-medium text-gray-700"
      >
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && (
        <p className="text-sm text-gray-500">{field.description}</p>
      )}
      <select
        id={field.id}
        name={field.name}
        value={(value as string) || ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-brand-purple
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? "border-red-500" : "border-gray-300"}
        `}
      >
        <option value="">{field.placeholder || "Select an option..."}</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
