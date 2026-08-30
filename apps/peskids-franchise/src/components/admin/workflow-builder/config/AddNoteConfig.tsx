"use client";

import { useRef } from "react";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:border-transparent";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

const VARIABLES = [
  { label: "First Name", value: "{{firstName}}" },
  { label: "Last Name", value: "{{lastName}}" },
  { label: "Email", value: "{{email}}" },
];

interface ConfigProps {
  data: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
}

export default function AddNoteConfig({ data, onChange }: ConfigProps) {
  const content = (data.content as string) || "";
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertVariable(variable: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange({ content: content + variable });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent =
      content.substring(0, start) + variable + content.substring(end);
    onChange({ content: newContent });

    // Restore cursor position after the inserted variable
    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPos = start + variable.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  }

  return (
    <div className="space-y-4">
      {/* Note Content */}
      <div>
        <label className={labelClass}>Note Content</label>
        <textarea
          ref={textareaRef}
          className={inputClass}
          rows={5}
          value={content}
          placeholder="Enter note content..."
          onChange={(e) => onChange({ content: e.target.value })}
        />
      </div>

      {/* Variable Insertion */}
      <div>
        <label className={labelClass}>Insert Variable</label>
        <div className="flex flex-wrap gap-2">
          {VARIABLES.map((v) => (
            <button
              key={v.value}
              type="button"
              className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-200 transition-colors"
              onClick={() => insertVariable(v.value)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Use {"{{variable}}"} for dynamic content
        </p>
      </div>
    </div>
  );
}
