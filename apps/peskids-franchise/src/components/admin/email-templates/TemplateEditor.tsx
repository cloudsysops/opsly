"use client";

import { useState } from "react";
import { VariableInserter } from "./VariableInserter";

interface TemplateEditorProps {
  isCreating: boolean;
  isSystem: boolean;
  name: string;
  description: string;
  subject: string;
  bodyHtml: string;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onSubjectChange: (subject: string) => void;
  onBodyChange: (body: string) => void;
  onSave: () => void;
  onDelete: () => void;
}

export function TemplateEditor({
  isCreating,
  isSystem,
  name,
  description,
  subject,
  bodyHtml,
  onNameChange,
  onDescriptionChange,
  onSubjectChange,
  onBodyChange,
  onSave,
  onDelete,
}: TemplateEditorProps) {
  const [showHtml, setShowHtml] = useState(true); // HTML mode by default
  const [activeField, setActiveField] = useState<"subject" | "body">("body");

  const handleInsertVariable = (variable: string) => {
    const insertion = `{{${variable}}}`;
    if (activeField === "subject") {
      onSubjectChange(subject + insertion);
    } else {
      onBodyChange(bodyHtml + insertion);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-navy">
          {isCreating ? "Create New Template" : "Edit Template"}
        </h2>
        <div className="flex items-center gap-2">
          {!isCreating && !isSystem && (
            <button
              onClick={onDelete}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Delete
            </button>
          )}
          <button
            onClick={onSave}
            className="px-4 py-1.5 text-sm bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors"
          >
            {isCreating ? "Create Template" : "Save Changes"}
          </button>
        </div>
      </div>

      {isSystem && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          This is a system template. You can edit the content, but the template cannot be deleted.
        </div>
      )}

      {/* Name and Description */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Template Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g., Welcome Email"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="e.g., Sent to new prospects"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
          />
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Subject Line
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          onFocus={() => setActiveField("subject")}
          placeholder="e.g., Welcome to Acme Franchise!"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent font-mono text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">
          Use {"{{firstName}}"}, {"{{lastName}}"}, etc. for personalization
        </p>
      </div>

      {/* Body */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Email Body
          </label>
          <div className="flex items-center gap-2">
            <VariableInserter onInsert={handleInsertVariable} />
            <button
              onClick={() => setShowHtml(!showHtml)}
              className={`px-2 py-1 text-xs rounded ${
                showHtml
                  ? "bg-brand-navy text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              HTML
            </button>
          </div>
        </div>

        <textarea
          value={bodyHtml}
          onChange={(e) => onBodyChange(e.target.value)}
          onFocus={() => setActiveField("body")}
          rows={20}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent font-mono text-sm resize-y"
          placeholder="Enter your email HTML here..."
        />
      </div>
    </div>
  );
}
