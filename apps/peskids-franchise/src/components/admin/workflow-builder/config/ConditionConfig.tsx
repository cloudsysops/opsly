"use client";

import { useState, useEffect } from "react";
import {
  CONDITION_FIELDS,
  OPERATOR_LABELS,
  type ConditionFieldDef,
} from "@/lib/automation/conditions";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:border-transparent";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

interface ConfigProps {
  data: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
}

export default function ConditionConfig({ data, onChange }: ConfigProps) {
  const fieldValue = (data.field as string) || "";
  const operator = (data.operator as string) || "";
  const value = (data.value as string) || "";

  const [selectedFieldDef, setSelectedFieldDef] =
    useState<ConditionFieldDef | null>(null);

  // Sync field definition when field value changes
  useEffect(() => {
    const def = CONDITION_FIELDS.find((f) => f.value === fieldValue) || null;
    setSelectedFieldDef(def);
  }, [fieldValue]);

  function handleFieldChange(newField: string) {
    const def = CONDITION_FIELDS.find((f) => f.value === newField);
    // Reset operator and value when field changes
    const defaultOperator = def?.operators[0] || "";
    onChange({
      field: newField,
      operator: defaultOperator,
      value: "",
    });
  }

  function handleOperatorChange(newOperator: string) {
    // Reset value when switching to/from "in" operator
    if (newOperator === "in" || operator === "in") {
      onChange({ operator: newOperator, value: "" });
    } else {
      onChange({ operator: newOperator });
    }
  }

  // Parse "in" operator multi-select values
  let inValues: string[] = [];
  if (operator === "in" && value) {
    try {
      inValues = JSON.parse(value) as string[];
    } catch {
      inValues = [];
    }
  }

  function handleInToggle(option: string, checked: boolean) {
    const updated = checked
      ? [...inValues, option]
      : inValues.filter((v) => v !== option);
    onChange({ value: JSON.stringify(updated) });
  }

  return (
    <div className="space-y-4">
      {/* Field */}
      <div>
        <label className={labelClass}>Field</label>
        <select
          className={inputClass}
          value={fieldValue}
          onChange={(e) => handleFieldChange(e.target.value)}
        >
          <option value="">Select a field...</option>
          {CONDITION_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Operator */}
      {selectedFieldDef && (
        <div>
          <label className={labelClass}>Operator</label>
          <select
            className={inputClass}
            value={operator}
            onChange={(e) => handleOperatorChange(e.target.value)}
          >
            {selectedFieldDef.operators.map((op) => (
              <option key={op} value={op}>
                {OPERATOR_LABELS[op] || op}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Value */}
      {selectedFieldDef && operator && (
        <div>
          <label className={labelClass}>Value</label>

          {/* "in" operator: multi-select checkboxes */}
          {operator === "in" && selectedFieldDef.options ? (
            <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-gray-300 p-3">
              {selectedFieldDef.options.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
                    checked={inValues.includes(opt)}
                    onChange={(e) => handleInToggle(opt, e.target.checked)}
                  />
                  {opt.replace(/_/g, " ")}
                </label>
              ))}
            </div>
          ) : /* "enum" type: dropdown */
          selectedFieldDef.type === "enum" && selectedFieldDef.options ? (
            <select
              className={inputClass}
              value={value}
              onChange={(e) => onChange({ value: e.target.value })}
            >
              <option value="">Select a value...</option>
              {selectedFieldDef.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          ) : /* "number" type: number input */
          selectedFieldDef.type === "number" ? (
            <input
              type="number"
              className={inputClass}
              value={value}
              placeholder="Enter a number..."
              onChange={(e) => onChange({ value: e.target.value })}
            />
          ) : (
            /* "text" type: text input */
            <input
              type="text"
              className={inputClass}
              value={value}
              placeholder="Enter a value..."
              onChange={(e) => onChange({ value: e.target.value })}
            />
          )}
        </div>
      )}
    </div>
  );
}
