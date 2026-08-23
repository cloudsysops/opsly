"use client";

import { useState, useEffect } from "react";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:border-transparent";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  subject: string;
  category: string;
  isActive: boolean;
}

interface ConfigProps {
  data: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
}

export default function SendEmailConfig({ data, onChange }: ConfigProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [useCustom, setUseCustom] = useState(
    Boolean(data.subject || data.body) && !data.templateId
  );

  const templateId = (data.templateId as string) || "";
  const subject = (data.subject as string) || "";
  const body = (data.body as string) || "";

  useEffect(() => {
    fetch("/api/admin/email-templates")
      .then((res) => res.json())
      .then((json) => {
        if (json.templates) {
          setTemplates(json.templates);
        }
      })
      .catch((err) => console.error("Failed to fetch email templates:", err))
      .finally(() => setLoading(false));
  }, []);

  const selectedTemplate = templates.find((t) => t.id === templateId);

  return (
    <div className="space-y-4">
      {/* Toggle: Template vs Custom */}
      <div className="flex gap-2">
        <button
          type="button"
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium border transition-colors ${
            !useCustom
              ? "bg-brand-purple text-white border-brand-purple"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
          onClick={() => {
            setUseCustom(false);
            onChange({ subject: undefined, body: undefined });
          }}
        >
          Use Template
        </button>
        <button
          type="button"
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium border transition-colors ${
            useCustom
              ? "bg-brand-purple text-white border-brand-purple"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
          onClick={() => {
            setUseCustom(true);
            onChange({ templateId: undefined, templateSlug: undefined });
          }}
        >
          Custom Email
        </button>
      </div>

      {!useCustom ? (
        <>
          {/* Template Selector */}
          <div>
            <label className={labelClass}>Email Template</label>
            {loading ? (
              <div className="text-sm text-gray-500 py-2">
                Loading templates...
              </div>
            ) : (
              <select
                className={inputClass}
                value={templateId}
                onChange={(e) => {
                  const tmpl = templates.find((t) => t.id === e.target.value);
                  onChange({
                    templateId: e.target.value || undefined,
                    templateSlug: tmpl?.slug || undefined,
                  });
                }}
              >
                <option value="">Select a template...</option>
                {templates
                  .filter((t) => t.isActive)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* Template Preview */}
          {selectedTemplate && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Preview
              </div>
              <div className="text-sm font-medium text-gray-900">
                {selectedTemplate.name}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Subject: {selectedTemplate.subject}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Custom Subject */}
          <div>
            <label className={labelClass}>Subject</label>
            <input
              type="text"
              className={inputClass}
              value={subject}
              placeholder="Email subject line"
              onChange={(e) => onChange({ subject: e.target.value })}
            />
          </div>

          {/* Custom Body */}
          <div>
            <label className={labelClass}>Body</label>
            <textarea
              className={inputClass}
              rows={5}
              value={body}
              placeholder="Email body text..."
              onChange={(e) => onChange({ body: e.target.value })}
            />
          </div>
        </>
      )}
    </div>
  );
}
