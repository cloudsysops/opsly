"use client";

import { FormField, FormFieldValue } from "@/lib/types/form-schema";

interface NumberFieldProps {
  field: FormField;
  value: FormFieldValue | undefined;
  onChange: (value: number | string) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
}

export function NumberField({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
}: NumberFieldProps) {
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
      <input
        type="number"
        id={field.id}
        name={field.name}
        value={typeof value === "number" || typeof value === "string" ? value : ""}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val === "" ? "" : Number(val));
        }}
        onBlur={onBlur}
        placeholder={field.placeholder}
        disabled={disabled}
        min={field.min}
        max={field.max}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-brand-purple
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? "border-red-500" : "border-gray-300"}
        `}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
