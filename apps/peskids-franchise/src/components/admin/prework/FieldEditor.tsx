"use client";

import { useState } from "react";
import { FormField, SelectOption, ValidationRule, ConditionalRule, FieldType, createField } from "@/lib/types/form-schema";

interface FieldEditorProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
  onClose: () => void;
  onDelete: () => void;
}

export function FieldEditor({ field, onUpdate, onClose, onDelete }: FieldEditorProps) {
  const [activeTab, setActiveTab] = useState<"basic" | "validation" | "conditional" | "nested">("basic");

  const hasOptions = ["select", "radio", "checkbox-group"].includes(field.type);
  const hasNestedFields = field.type === "repeatable-group";
  const isLayoutField = ["section-header", "info-box"].includes(field.type);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Edit Field</h3>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <TabButton active={activeTab === "basic"} onClick={() => setActiveTab("basic")}>
          Basic
        </TabButton>
        {!isLayoutField && (
          <>
            <TabButton active={activeTab === "validation"} onClick={() => setActiveTab("validation")}>
              Validation
            </TabButton>
            <TabButton active={activeTab === "conditional"} onClick={() => setActiveTab("conditional")}>
              Conditional
            </TabButton>
          </>
        )}
        {hasNestedFields && (
          <TabButton active={activeTab === "nested"} onClick={() => setActiveTab("nested")}>
            Nested Fields
          </TabButton>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === "basic" && (
          <BasicSettings field={field} onUpdate={onUpdate} hasOptions={hasOptions} />
        )}
        {activeTab === "validation" && (
          <ValidationSettings field={field} onUpdate={onUpdate} />
        )}
        {activeTab === "conditional" && (
          <ConditionalSettings field={field} onUpdate={onUpdate} />
        )}
        {activeTab === "nested" && (
          <NestedFieldsEditor field={field} onUpdate={onUpdate} />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200">
        <button
          onClick={onDelete}
          className="w-full py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          Delete Field
        </button>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors
        ${active ? "border-brand-purple text-brand-purple" : "border-transparent text-gray-500 hover:text-gray-700"}
      `}
    >
      {children}
    </button>
  );
}

// Basic Settings Tab
function BasicSettings({
  field,
  onUpdate,
  hasOptions,
}: {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
  hasOptions: boolean;
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
        <input
          type="text"
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Field Name</label>
        <input
          type="text"
          value={field.name}
          onChange={(e) => onUpdate({ name: e.target.value.replace(/\s/g, "_").toLowerCase() })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">Used in form data. No spaces allowed.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={field.description || ""}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
          placeholder="Help text shown below the field"
        />
      </div>

      {!["section-header", "info-box", "checkbox"].includes(field.type) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
          <input
            type="text"
            value={field.placeholder || ""}
            onChange={(e) => onUpdate({ placeholder: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
          />
        </div>
      )}

      {!["section-header", "info-box"].includes(field.type) && (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={field.required || false}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="w-4 h-4 text-brand-purple rounded focus:ring-brand-purple"
          />
          <span className="text-sm text-gray-700">Required field</span>
        </label>
      )}

      {field.type === "textarea" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rows</label>
          <input
            type="number"
            value={field.rows || 4}
            onChange={(e) => onUpdate({ rows: Number(e.target.value) })}
            min={2}
            max={20}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
          />
        </div>
      )}

      {field.type === "number" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Value</label>
            <input
              type="number"
              value={field.min ?? ""}
              onChange={(e) => onUpdate({ min: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Value</label>
            <input
              type="number"
              value={field.max ?? ""}
              onChange={(e) => onUpdate({ max: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
            />
          </div>
        </div>
      )}

      {field.type === "repeatable-group" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Entries</label>
            <input
              type="number"
              value={field.min ?? ""}
              onChange={(e) => onUpdate({ min: e.target.value ? Number(e.target.value) : undefined })}
              min={0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Entries</label>
            <input
              type="number"
              value={field.max ?? ""}
              onChange={(e) => onUpdate({ max: e.target.value ? Number(e.target.value) : undefined })}
              min={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
            />
          </div>
        </div>
      )}

      {field.type === "info-box" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Variant</label>
          <select
            value={field.variant || "info"}
            onChange={(e) => onUpdate({ variant: e.target.value as "info" | "warning" | "success" })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
          >
            <option value="info">Info (Blue)</option>
            <option value="warning">Warning (Yellow)</option>
            <option value="success">Success (Green)</option>
          </select>
        </div>
      )}

      {field.type === "file" && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Accepted File Types</label>
            <input
              type="text"
              value={field.accept || ""}
              onChange={(e) => onUpdate({ accept: e.target.value })}
              placeholder=".pdf,.doc,.docx"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max File Size (MB)</label>
            <input
              type="number"
              value={field.maxSize ? field.maxSize / (1024 * 1024) : 10}
              onChange={(e) => onUpdate({ maxSize: Number(e.target.value) * 1024 * 1024 })}
              min={1}
              max={50}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
            />
          </div>
        </>
      )}

      {hasOptions && <OptionsEditor options={field.options || []} onUpdate={(options) => onUpdate({ options })} />}
    </>
  );
}

// Options Editor for select/radio/checkbox-group
function OptionsEditor({
  options,
  onUpdate,
}: {
  options: SelectOption[];
  onUpdate: (options: SelectOption[]) => void;
}) {
  const addOption = () => {
    onUpdate([...options, { value: `option_${options.length + 1}`, label: `Option ${options.length + 1}` }]);
  };

  const updateOption = (index: number, updates: Partial<SelectOption>) => {
    onUpdate(options.map((opt, i) => (i === index ? { ...opt, ...updates } : opt)));
  };

  const removeOption = (index: number) => {
    onUpdate(options.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={option.label}
              onChange={(e) => updateOption(index, { label: e.target.value })}
              placeholder="Label"
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-purple"
            />
            <input
              type="text"
              value={option.value}
              onChange={(e) => updateOption(index, { value: e.target.value })}
              placeholder="Value"
              className="w-24 px-2 py-1.5 text-sm font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-purple"
            />
            <button onClick={() => removeOption(index)} className="p-1 text-gray-400 hover:text-red-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <button onClick={addOption} className="mt-2 text-sm text-brand-purple hover:underline">
        + Add Option
      </button>
    </div>
  );
}

// Validation Settings Tab
function ValidationSettings({ field, onUpdate }: { field: FormField; onUpdate: (updates: Partial<FormField>) => void }) {
  const rules = field.validation || [];

  const addRule = (type: ValidationRule["type"]) => {
    const newRule: ValidationRule = { type, message: "" };
    if (["minLength", "maxLength", "min", "max"].includes(type)) {
      newRule.value = 0;
    }
    onUpdate({ validation: [...rules, newRule] });
  };

  const updateRule = (index: number, updates: Partial<ValidationRule>) => {
    onUpdate({
      validation: rules.map((rule, i) => (i === index ? { ...rule, ...updates } : rule)),
    });
  };

  const removeRule = (index: number) => {
    onUpdate({ validation: rules.filter((_, i) => i !== index) });
  };

  const availableRules = [
    { type: "minLength" as const, label: "Min Length" },
    { type: "maxLength" as const, label: "Max Length" },
    { type: "min" as const, label: "Min Value" },
    { type: "max" as const, label: "Max Value" },
    { type: "pattern" as const, label: "Pattern (Regex)" },
    { type: "email" as const, label: "Email Format" },
    { type: "url" as const, label: "URL Format" },
    { type: "phone" as const, label: "Phone Format" },
  ];

  return (
    <>
      {rules.map((rule, index) => (
        <div key={index} className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 capitalize">{rule.type.replace(/([A-Z])/g, " $1")}</span>
            <button onClick={() => removeRule(index)} className="text-gray-400 hover:text-red-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {["minLength", "maxLength", "min", "max"].includes(rule.type) && (
            <input
              type="number"
              value={rule.value as number}
              onChange={(e) => updateRule(index, { value: Number(e.target.value) })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded mb-2"
              placeholder="Value"
            />
          )}
          {rule.type === "pattern" && (
            <input
              type="text"
              value={rule.value as string}
              onChange={(e) => updateRule(index, { value: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded mb-2 font-mono"
              placeholder="^[A-Za-z]+$"
            />
          )}
          <input
            type="text"
            value={rule.message}
            onChange={(e) => updateRule(index, { message: e.target.value })}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
            placeholder="Error message"
          />
        </div>
      ))}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Add Validation Rule</label>
        <select
          onChange={(e) => {
            if (e.target.value) {
              addRule(e.target.value as ValidationRule["type"]);
              e.target.value = "";
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
          defaultValue=""
        >
          <option value="">Select a rule...</option>
          {availableRules.map((rule) => (
            <option key={rule.type} value={rule.type}>
              {rule.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

// Conditional Settings Tab
function ConditionalSettings({ field, onUpdate }: { field: FormField; onUpdate: (updates: Partial<FormField>) => void }) {
  const conditional = field.conditional;

  const updateConditional = (updates: Partial<ConditionalRule>) => {
    onUpdate({
      conditional: conditional ? { ...conditional, ...updates } : ({ field: "", operator: "equals", action: "show", ...updates } as ConditionalRule),
    });
  };

  const removeConditional = () => {
    onUpdate({ conditional: undefined });
  };

  return (
    <>
      {conditional ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">When field</label>
            <input
              type="text"
              value={conditional.field}
              onChange={(e) => updateConditional({ field: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple font-mono text-sm"
              placeholder="field_name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
            <select
              value={conditional.operator}
              onChange={(e) => updateConditional({ operator: e.target.value as ConditionalRule["operator"] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
            >
              <option value="equals">Equals</option>
              <option value="notEquals">Not Equals</option>
              <option value="contains">Contains</option>
              <option value="notContains">Not Contains</option>
              <option value="isEmpty">Is Empty</option>
              <option value="isNotEmpty">Is Not Empty</option>
            </select>
          </div>

          {!["isEmpty", "isNotEmpty"].includes(conditional.operator) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
              <input
                type="text"
                value={String(conditional.value ?? "")}
                onChange={(e) => updateConditional({ value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Then</label>
            <select
              value={conditional.action}
              onChange={(e) => updateConditional({ action: e.target.value as ConditionalRule["action"] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
            >
              <option value="show">Show this field</option>
              <option value="hide">Hide this field</option>
              <option value="require">Make required</option>
              <option value="disable">Disable this field</option>
            </select>
          </div>

          <button onClick={removeConditional} className="text-sm text-red-600 hover:underline">
            Remove Conditional Logic
          </button>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No conditional logic set</p>
          <button
            onClick={() => updateConditional({ field: "", operator: "equals", action: "show" })}
            className="px-4 py-2 bg-brand-purple text-white rounded-lg hover:bg-brand-purple/90"
          >
            Add Conditional Logic
          </button>
        </div>
      )}
    </>
  );
}

// Nested Fields Editor for repeatable-group
function NestedFieldsEditor({ field, onUpdate }: { field: FormField; onUpdate: (updates: Partial<FormField>) => void }) {
  const nestedFields = field.fields || [];

  const addNestedField = (type: FieldType) => {
    const newField = createField(type);
    onUpdate({ fields: [...nestedFields, newField] });
  };

  const updateNestedField = (fieldId: string, updates: Partial<FormField>) => {
    onUpdate({
      fields: nestedFields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
    });
  };

  const removeNestedField = (fieldId: string) => {
    onUpdate({ fields: nestedFields.filter((f) => f.id !== fieldId) });
  };

  const simpleFieldTypes: FieldType[] = ["text", "textarea", "number", "email", "phone", "url", "date", "select", "radio", "checkbox"];

  return (
    <div className="space-y-4">
      {nestedFields.map((nestedField) => (
        <div key={nestedField.id} className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{nestedField.label}</span>
            <button onClick={() => removeNestedField(nestedField.id)} className="text-gray-400 hover:text-red-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            <input
              type="text"
              value={nestedField.label}
              onChange={(e) => updateNestedField(nestedField.id, { label: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
              placeholder="Label"
            />
            <input
              type="text"
              value={nestedField.name}
              onChange={(e) => updateNestedField(nestedField.id, { name: e.target.value.replace(/\s/g, "_").toLowerCase() })}
              className="w-full px-2 py-1.5 text-sm font-mono border border-gray-300 rounded"
              placeholder="field_name"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={nestedField.required || false}
                onChange={(e) => updateNestedField(nestedField.id, { required: e.target.checked })}
                className="w-4 h-4 text-brand-purple rounded"
              />
              Required
            </label>
          </div>
        </div>
      ))}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Add Nested Field</label>
        <select
          onChange={(e) => {
            if (e.target.value) {
              addNestedField(e.target.value as FieldType);
              e.target.value = "";
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
          defaultValue=""
        >
          <option value="">Select field type...</option>
          {simpleFieldTypes.map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " ")}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
