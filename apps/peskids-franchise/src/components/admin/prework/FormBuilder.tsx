"use client";

import { useState, useEffect, useCallback } from "react";
import { FormSchema, FormField, FieldType, createField } from "@/lib/types/form-schema";
import { FieldTypeSelector } from "./FieldTypeSelector";
import { FieldEditor } from "./FieldEditor";
import { FormPreview } from "./FormPreview";
import { PublishControls } from "./PublishControls";
import { AISuggestionsPanel } from "./AISuggestionsPanel";

interface FormBuilderProps {
  moduleId: string;
  moduleTitle: string;
  onUpdate: () => void;
}

interface ModuleDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  instructions: string;
  formSchema: FormSchema | null;
  formSchemaVersion: number;
  draftFormSchema: FormSchema | null;
  draftUpdatedAt: string | null;
  draftUpdatedBy: string | null;
  hasDraft: boolean;
  submissionCount: number;
  latestSuggestion: {
    id: string;
    suggestions: unknown[];
    analysisData: unknown;
    generatedAt: string;
  } | null;
}

export function FormBuilder({ moduleId, moduleTitle, onUpdate }: FormBuilderProps) {
  const [module, setModule] = useState<ModuleDetail | null>(null);
  const [schema, setSchema] = useState<FormSchema>({ version: 1, fields: [] });
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch module details
  useEffect(() => {
    const fetchModule = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/prework/${moduleId}`);
        if (!res.ok) throw new Error("Failed to fetch module");
        const data = await res.json();
        setModule(data);

        // Use draft if exists, otherwise published schema
        const activeSchema = data.draftFormSchema || data.formSchema;
        if (activeSchema) {
          setSchema(activeSchema as FormSchema);
        } else {
          setSchema({ version: data.formSchemaVersion || 1, fields: [] });
        }
        setHasUnsavedChanges(false);
      } catch (err) {
        console.error("Error fetching module:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchModule();
  }, [moduleId]);

  // Auto-save draft after changes (debounced)
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timeout = setTimeout(() => {
      saveDraft();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [schema, hasUnsavedChanges]);

  const saveDraft = async () => {
    if (!module) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/prework/${moduleId}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formSchema: schema }),
      });
      if (!res.ok) throw new Error("Failed to save draft");
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      onUpdate();
    } catch (err) {
      console.error("Error saving draft:", err);
    } finally {
      setSaving(false);
    }
  };

  const updateSchema = useCallback((newFields: FormField[]) => {
    setSchema((prev) => ({ ...prev, fields: newFields }));
    setHasUnsavedChanges(true);
  }, []);

  const addField = (type: FieldType) => {
    const newField = createField(type);
    updateSchema([...schema.fields, newField]);
    setEditingFieldId(newField.id);
    setShowFieldSelector(false);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    updateSchema(
      schema.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    );
  };

  const deleteField = (fieldId: string) => {
    updateSchema(schema.fields.filter((f) => f.id !== fieldId));
    if (editingFieldId === fieldId) {
      setEditingFieldId(null);
    }
  };

  const moveField = (fieldId: string, direction: "up" | "down") => {
    const index = schema.fields.findIndex((f) => f.id === fieldId);
    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= schema.fields.length) return;

    const newFields = [...schema.fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    updateSchema(newFields);
  };

  const duplicateField = (fieldId: string) => {
    const field = schema.fields.find((f) => f.id === fieldId);
    if (!field) return;

    const newField = createField(field.type, {
      ...field,
      name: `${field.name}_copy`,
      label: `${field.label} (Copy)`,
    });

    const index = schema.fields.findIndex((f) => f.id === fieldId);
    const newFields = [...schema.fields];
    newFields.splice(index + 1, 0, newField);
    updateSchema(newFields);
  };

  const editingField = schema.fields.find((f) => f.id === editingFieldId);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">{moduleTitle}</h2>
          <span className="text-sm text-gray-500">
            {schema.fields.length} fields
          </span>
          {saving && (
            <span className="text-sm text-gray-400">Saving...</span>
          )}
          {lastSaved && !saving && !hasUnsavedChanges && (
            <span className="text-sm text-green-600">
              Saved {formatRelativeTime(lastSaved)}
            </span>
          )}
          {hasUnsavedChanges && !saving && (
            <span className="text-sm text-yellow-600">Unsaved changes</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Suggestions
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-2
              ${showPreview ? "bg-brand-purple text-white" : "text-gray-700 hover:bg-gray-100"}
            `}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
          </button>
          <PublishControls
            moduleId={moduleId}
            hasDraft={module?.hasDraft || hasUnsavedChanges}
            currentVersion={module?.formSchemaVersion || 1}
            onPublish={() => {
              onUpdate();
              setHasUnsavedChanges(false);
            }}
            onDiscard={() => {
              // Reload module to get published schema
              window.location.reload();
            }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Field List / Builder */}
        <div className={`flex-1 overflow-y-auto p-6 ${showPreview ? "hidden" : ""}`}>
          {schema.fields.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium mb-2">No fields yet</p>
              <p className="text-sm mb-4">Add fields to build your form</p>
              <button
                onClick={() => setShowFieldSelector(true)}
                className="px-4 py-2 bg-brand-purple text-white rounded-lg hover:bg-brand-purple/90"
              >
                Add First Field
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {schema.fields.map((field, index) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  index={index}
                  isEditing={editingFieldId === field.id}
                  onEdit={() => setEditingFieldId(field.id)}
                  onDelete={() => deleteField(field.id)}
                  onMoveUp={() => moveField(field.id, "up")}
                  onMoveDown={() => moveField(field.id, "down")}
                  onDuplicate={() => duplicateField(field.id)}
                  canMoveUp={index > 0}
                  canMoveDown={index < schema.fields.length - 1}
                />
              ))}

              <button
                onClick={() => setShowFieldSelector(true)}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-brand-purple hover:text-brand-purple transition-colors"
              >
                + Add Field
              </button>
            </div>
          )}
        </div>

        {/* Preview Mode */}
        {showPreview && (
          <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-6">
              <FormPreview schema={schema} />
            </div>
          </div>
        )}

        {/* Field Editor Sidebar */}
        {editingField && !showPreview && (
          <div className="w-96 border-l border-gray-200 bg-white overflow-y-auto">
            <FieldEditor
              field={editingField}
              onUpdate={(updates) => updateField(editingField.id, updates)}
              onClose={() => setEditingFieldId(null)}
              onDelete={() => deleteField(editingField.id)}
            />
          </div>
        )}

        {/* AI Suggestions Panel */}
        {showSuggestions && (
          <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
            <AISuggestionsPanel
              moduleId={moduleId}
              onApplySuggestion={(suggestion) => {
                // Apply suggestion to schema
                console.log("Apply suggestion:", suggestion);
              }}
              onClose={() => setShowSuggestions(false)}
            />
          </div>
        )}
      </div>

      {/* Field Type Selector Modal */}
      {showFieldSelector && (
        <FieldTypeSelector
          onSelect={addField}
          onClose={() => setShowFieldSelector(false)}
        />
      )}
    </div>
  );
}

// Field Card Component
interface FieldCardProps {
  field: FormField;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function FieldCard({
  field,
  index,
  isEditing,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  canMoveUp,
  canMoveDown,
}: FieldCardProps) {
  const typeLabels: Record<FieldType, string> = {
    text: "Text",
    textarea: "Long Text",
    number: "Number",
    email: "Email",
    phone: "Phone",
    url: "URL",
    date: "Date",
    select: "Dropdown",
    radio: "Radio Buttons",
    checkbox: "Checkbox",
    "checkbox-group": "Checkbox Group",
    file: "File Upload",
    "repeatable-group": "Repeatable Group",
    "section-header": "Section Header",
    "info-box": "Info Box",
  };

  const typeIcons: Record<FieldType, string> = {
    text: "T",
    textarea: "¶",
    number: "#",
    email: "@",
    phone: "☎",
    url: "🔗",
    date: "📅",
    select: "▼",
    radio: "◉",
    checkbox: "☑",
    "checkbox-group": "☑☑",
    file: "📎",
    "repeatable-group": "⊕",
    "section-header": "§",
    "info-box": "ℹ",
  };

  return (
    <div
      className={`
        bg-white border rounded-lg overflow-hidden
        ${isEditing ? "border-brand-purple ring-2 ring-brand-purple/20" : "border-gray-200"}
      `}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Drag handle / index */}
        <div className="flex flex-col items-center gap-1 text-gray-400">
          <svg className="w-4 h-4 cursor-move" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </div>

        {/* Type icon */}
        <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-gray-600 text-sm font-medium">
          {typeIcons[field.type]}
        </div>

        {/* Field info */}
        <div className="flex-1 min-w-0" onClick={onEdit}>
          <div className="flex items-center gap-2 cursor-pointer">
            <span className="font-medium text-gray-900 truncate">{field.label}</span>
            {field.required && (
              <span className="text-xs text-red-500">Required</span>
            )}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span>{typeLabels[field.type]}</span>
            <span>•</span>
            <span className="font-mono">{field.name}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Move up"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Move down"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={onDuplicate}
            className="p-1.5 text-gray-400 hover:text-gray-600"
            title="Duplicate"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
