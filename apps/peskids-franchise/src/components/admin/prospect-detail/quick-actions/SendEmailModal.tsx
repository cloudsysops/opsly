"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { VariableInserter } from "@/components/admin/email-templates/VariableInserter";

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  category: string;
  subject: string;
  bodyHtml: string;
  variables: string[];
}

interface SendEmailModalProps {
  prospectId: string;
  prospectName: string;
  prospectEmail: string;
  onClose: () => void;
}

export function SendEmailModal({
  prospectId,
  prospectName,
  prospectEmail,
  onClose,
}: SendEmailModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  // Fetch templates on mount
  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch("/api/admin/email-templates");
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.templates);
        }
      } catch {
        console.error("Failed to fetch templates");
      } finally {
        setIsLoadingTemplates(false);
      }
    }
    fetchTemplates();
  }, []);

  // Load template content when selected
  async function handleTemplateSelect(templateId: string) {
    setSelectedTemplateId(templateId);

    if (!templateId) {
      setSubject("");
      setBodyHtml("");
      return;
    }

    try {
      const res = await fetch(`/api/admin/email-templates/${templateId}`);
      if (res.ok) {
        const data = await res.json();
        setSubject(data.template.subject);
        setBodyHtml(data.template.bodyHtml);
      }
    } catch {
      setError("Failed to load template");
    }
  }

  // Insert variable at cursor position
  const handleInsertVariable = (variable: string) => {
    const insertion = `{{${variable}}}`;
    setBodyHtml((prev) => prev + insertion);
  };

  // Preview the email
  async function handlePreview() {
    if (!subject || !bodyHtml) return;

    try {
      const res = await fetch(`/api/admin/email-templates/preview/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, bodyHtml }),
      });

      if (res.ok) {
        const data = await res.json();
        setPreviewHtml(data.bodyHtml);
        setShowPreview(true);
      }
    } catch {
      setError("Failed to generate preview");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!subject.trim() || !bodyHtml.trim()) {
      setError("Subject and body are required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/prospects/${prospectId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId || undefined,
          subject,
          bodyHtml,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send email");
      }

      setSuccess(true);
      setTimeout(() => {
        router.refresh();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error sending email:", err);
      setError(err instanceof Error ? err.message : "Failed to send email. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

  const categoryLabels: Record<string, string> = {
    PROSPECT: "Prospect Templates",
    ADMIN: "Admin Templates",
    DOCUMENT: "Document Templates",
    CUSTOM: "Custom Templates",
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="email-sent-title">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 id="email-sent-title" className="text-lg font-semibold text-gray-900 mb-2">Email Sent!</h3>
          <p className="text-gray-600">Your email has been sent to {prospectEmail}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="send-email-title">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h3 id="send-email-title" className="text-lg font-semibold text-brand-navy">Send Email</h3>
            <p className="text-sm text-gray-500">
              To: {prospectName} &lt;{prospectEmail}&gt;
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Template Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template (Optional)
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                disabled={isLoadingTemplates}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              >
                <option value="">Start from scratch...</option>
                {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                  <optgroup key={category} label={categoryLabels[category] || category}>
                    {categoryTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              />
            </div>

            {/* Body */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Body
                </label>
                <div className="flex items-center gap-2">
                  <VariableInserter onInsert={handleInsertVariable} />
                  <button
                    type="button"
                    onClick={handlePreview}
                    className="text-xs text-brand-cyan hover:underline"
                  >
                    Preview
                  </button>
                </div>
              </div>
              <textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={12}
                placeholder="Enter your email content (HTML)..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent font-mono text-sm resize-y"
              />
              <p className="mt-1 text-xs text-gray-500">
                Variables like {"{{firstName}}"} will be replaced with the prospect&apos;s actual data
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !subject || !bodyHtml}
              className="px-4 py-2 text-white bg-brand-cyan rounded-lg hover:bg-brand-cyan/80 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Email
                </>
              )}
            </button>
          </div>
        </form>

        {/* Preview Modal */}
        {showPreview && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="email-preview-title">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h4 id="email-preview-title" className="font-semibold">Email Preview</h4>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-500"
                  aria-label="Close preview"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-auto max-h-[60vh]">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-[500px] border-0"
                  sandbox="allow-same-origin"
                  title="Email Preview"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
