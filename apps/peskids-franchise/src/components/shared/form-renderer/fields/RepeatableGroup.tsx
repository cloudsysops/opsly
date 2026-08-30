"use client";

import { useState } from "react";
import { FormField, FormFieldValue, RepeatableGroupEntry } from "@/lib/types/form-schema";

interface RepeatableGroupProps {
  field: FormField;
  value: FormFieldValue | undefined;
  onChange: (value: RepeatableGroupEntry[]) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
  renderField: (
    field: FormField,
    value: FormFieldValue | undefined,
    onChange: (value: FormFieldValue) => void,
    onBlur: () => void,
    error?: string,
    disabled?: boolean
  ) => React.ReactNode;
  getFieldError: (fieldName: string) => string | undefined;
}

export function RepeatableGroup({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  renderField,
  getFieldError,
}: RepeatableGroupProps) {
  const entries = (value as RepeatableGroupEntry[]) || [];
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    entries.length === 0 ? null : 0
  );

  const addEntry = () => {
    const newEntry: RepeatableGroupEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    // Initialize with default values
    field.fields?.forEach((f) => {
      if (f.defaultValue !== undefined) {
        newEntry[f.name] = f.defaultValue;
      }
    });
    const newEntries = [...entries, newEntry];
    onChange(newEntries);
    setExpandedIndex(newEntries.length - 1);
  };

  const removeEntry = (index: number) => {
    const newEntries = entries.filter((_, i) => i !== index);
    onChange(newEntries);
    if (expandedIndex === index) {
      setExpandedIndex(newEntries.length > 0 ? Math.max(0, index - 1) : null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  const updateEntry = (index: number, fieldName: string, fieldValue: FormFieldValue) => {
    const newEntries = entries.map((entry, i) =>
      i === index ? { ...entry, [fieldName]: fieldValue } : entry
    );
    onChange(newEntries);
  };

  const canAdd = field.max === undefined || entries.length < field.max;
  const canRemove = field.min === undefined || entries.length > field.min;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <span className="text-sm text-gray-500">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
          {field.min !== undefined && ` (min: ${field.min})`}
          {field.max !== undefined && ` (max: ${field.max})`}
        </span>
      </div>
      {field.description && (
        <p className="text-sm text-gray-500">{field.description}</p>
      )}

      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <div
              className={`
                flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer
                ${expandedIndex === index ? "border-b border-gray-200" : ""}
              `}
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center bg-brand-purple text-white text-sm font-medium rounded-full">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {getEntrySummary(entry, field.fields)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canRemove && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeEntry(index);
                    }}
                    disabled={disabled}
                    className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedIndex === index ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            {expandedIndex === index && (
              <div className="p-4 space-y-4 bg-white">
                {field.fields?.map((nestedField) => {
                  const nestedFieldName = `${field.name}.${index}.${nestedField.name}`;
                  const nestedValue = entry[nestedField.name];
                  const nestedError = getFieldError(nestedFieldName);

                  return (
                    <div key={nestedField.id}>
                      {renderField(
                        nestedField,
                        nestedValue,
                        (newValue) => updateEntry(index, nestedField.name, newValue),
                        onBlur,
                        nestedError,
                        disabled
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {canAdd && (
        <button
          type="button"
          onClick={addEntry}
          disabled={disabled}
          className={`
            w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg
            text-sm font-medium text-gray-600
            hover:border-brand-purple hover:text-brand-purple hover:bg-brand-purple/5
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <span className="flex items-center justify-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add {field.label.replace(/s$/, "")}
          </span>
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function getEntrySummary(entry: RepeatableGroupEntry, fields?: FormField[]): string {
  if (!fields || fields.length === 0) return "Entry";

  // Try to find a good summary field (name, title, or first text field)
  const summaryField = fields.find(
    (f) =>
      f.name.toLowerCase().includes("name") ||
      f.name.toLowerCase().includes("title") ||
      f.type === "text"
  );

  if (summaryField && entry[summaryField.name]) {
    const value = entry[summaryField.name];
    if (typeof value === "string") {
      return value.length > 50 ? value.substring(0, 50) + "..." : value;
    }
  }

  return "Entry";
}
