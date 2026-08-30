"use client";

import { useState, useEffect } from "react";

interface TemplatePreviewProps {
  templateId?: string;
  subject: string;
  bodyHtml: string;
}

export function TemplatePreview({ templateId, subject, bodyHtml }: TemplatePreviewProps) {
  const [renderedSubject, setRenderedSubject] = useState(subject);
  const [renderedBody, setRenderedBody] = useState(bodyHtml);
  const [isLoading, setIsLoading] = useState(false);

  // Debounced preview update
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!subject && !bodyHtml) return;

      setIsLoading(true);
      try {
        // Use templateId if available, otherwise use "preview" as placeholder
        const previewId = templateId || "preview";
        const res = await fetch(`/api/admin/email-templates/${previewId}/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, bodyHtml }),
        });

        if (res.ok) {
          const data = await res.json();
          setRenderedSubject(data.subject);
          setRenderedBody(data.bodyHtml);
        }
      } catch {
        // On error, just show raw content
        setRenderedSubject(subject);
        setRenderedBody(bodyHtml);
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [subject, bodyHtml, templateId]);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Preview</h3>

      {/* Email Header Preview */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-500">From:</span>
            <span className="text-gray-900">Acme Franchise Franchising</span>
            <span className="text-gray-400">&lt;franchising@acmefranchise.com&gt;</span>
          </div>
          <div className="flex items-center gap-2 text-sm mt-1">
            <span className="font-medium text-gray-500">To:</span>
            <span className="text-gray-900">john.smith@example.com</span>
          </div>
          <div className="flex items-center gap-2 text-sm mt-1">
            <span className="font-medium text-gray-500">Subject:</span>
            <span className="text-gray-900 font-medium">{renderedSubject || "(No subject)"}</span>
          </div>
        </div>

        {/* Email Body Preview */}
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-navy"></div>
            </div>
          )}

          {renderedBody ? (
            <iframe
              srcDoc={renderedBody}
              className="w-full h-[500px] border-0"
              sandbox="allow-same-origin"
              title="Email Preview"
            />
          ) : (
            <div className="p-8 text-center text-gray-500">
              Enter content to see preview
            </div>
          )}
        </div>
      </div>

      {/* Variable Legend */}
      <div className="text-xs text-gray-500">
        <p className="font-medium mb-1">Sample data used for preview:</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          <div>firstName: John</div>
          <div>lastName: Smith</div>
          <div>email: john.smith@example.com</div>
          <div>territory: Austin, TX</div>
        </div>
      </div>
    </div>
  );
}
