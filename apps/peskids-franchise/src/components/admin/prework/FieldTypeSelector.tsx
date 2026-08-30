"use client";

import { FieldType } from "@/lib/types/form-schema";

interface FieldTypeSelectorProps {
  onSelect: (type: FieldType) => void;
  onClose: () => void;
}

interface FieldTypeOption {
  type: FieldType;
  label: string;
  description: string;
  icon: string;
  category: "input" | "choice" | "layout" | "advanced";
}

const fieldTypes: FieldTypeOption[] = [
  // Input fields
  { type: "text", label: "Text", description: "Single line text input", icon: "T", category: "input" },
  { type: "textarea", label: "Long Text", description: "Multi-line text area", icon: "¶", category: "input" },
  { type: "number", label: "Number", description: "Numeric input", icon: "#", category: "input" },
  { type: "email", label: "Email", description: "Email address with validation", icon: "@", category: "input" },
  { type: "phone", label: "Phone", description: "Phone number input", icon: "☎", category: "input" },
  { type: "url", label: "URL", description: "Website URL input", icon: "🔗", category: "input" },
  { type: "date", label: "Date", description: "Date picker", icon: "📅", category: "input" },

  // Choice fields
  { type: "select", label: "Dropdown", description: "Select from a list", icon: "▼", category: "choice" },
  { type: "radio", label: "Radio Buttons", description: "Single choice from options", icon: "◉", category: "choice" },
  { type: "checkbox", label: "Checkbox", description: "Yes/No toggle", icon: "☑", category: "choice" },
  { type: "checkbox-group", label: "Checkbox Group", description: "Multiple selections", icon: "☑☑", category: "choice" },

  // Layout fields
  { type: "section-header", label: "Section Header", description: "Group related fields", icon: "§", category: "layout" },
  { type: "info-box", label: "Info Box", description: "Display helpful information", icon: "ℹ", category: "layout" },

  // Advanced fields
  { type: "file", label: "File Upload", description: "Upload documents or images", icon: "📎", category: "advanced" },
  { type: "repeatable-group", label: "Repeatable Group", description: "Add multiple entries", icon: "⊕", category: "advanced" },
];

const categories = [
  { id: "input", label: "Input Fields" },
  { id: "choice", label: "Choice Fields" },
  { id: "layout", label: "Layout" },
  { id: "advanced", label: "Advanced" },
];

export function FieldTypeSelector({ onSelect, onClose }: FieldTypeSelectorProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add Field</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {categories.map((category) => {
            const categoryFields = fieldTypes.filter((f) => f.category === category.id);
            if (categoryFields.length === 0) return null;

            return (
              <div key={category.id} className="mb-6 last:mb-0">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {category.label}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {categoryFields.map((field) => (
                    <button
                      key={field.type}
                      onClick={() => onSelect(field.type)}
                      className="flex items-start gap-3 p-3 text-left border border-gray-200 rounded-lg hover:border-brand-purple hover:bg-brand-purple/5 transition-colors"
                    >
                      <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg text-lg">
                        {field.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">{field.label}</div>
                        <div className="text-sm text-gray-500">{field.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
