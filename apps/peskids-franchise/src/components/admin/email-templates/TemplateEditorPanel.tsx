"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { VariableInserter } from "./VariableInserter";
import {
  PencilSquareIcon,
  EyeIcon,
  CodeBracketIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

interface TemplateEditorPanelProps {
  templateId?: string;
  isCreating: boolean;
  isSystem: boolean;
  name: string;
  description: string;
  subject: string;
  bodyHtml: string;
  defaultTo: string;
  defaultCc: string;
  defaultFrom: string;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onSubjectChange: (subject: string) => void;
  onBodyChange: (body: string) => void;
  onDefaultToChange: (value: string) => void;
  onDefaultCcChange: (value: string) => void;
  onDefaultFromChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
}

export function TemplateEditorPanel({
  templateId,
  isCreating,
  isSystem,
  name,
  description,
  subject,
  bodyHtml,
  defaultTo,
  defaultCc,
  defaultFrom,
  saveStatus,
  onNameChange,
  onDescriptionChange,
  onSubjectChange,
  onBodyChange,
  onDefaultToChange,
  onDefaultCcChange,
  onDefaultFromChange,
  onSave,
  onDelete,
}: TemplateEditorPanelProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [showHtmlEditor, setShowHtmlEditor] = useState(false);
  const [renderedSubject, setRenderedSubject] = useState(subject);
  const [renderedBody, setRenderedBody] = useState(bodyHtml);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const visualTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Gmail field refs for variable insertion at cursor
  const gmailFromRef = useRef<HTMLInputElement>(null);
  const gmailToRef = useRef<HTMLInputElement>(null);
  const gmailCcRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const lastFocusedGmailField = useRef<"from" | "to" | "cc" | "subject" | null>(null);

  const insertVariableAtCursor = useCallback((variable: string) => {
    const insertion = `{{${variable}}}`;
    const fieldMap = {
      from: { ref: gmailFromRef, onChange: onDefaultFromChange, value: defaultFrom },
      to: { ref: gmailToRef, onChange: onDefaultToChange, value: defaultTo },
      cc: { ref: gmailCcRef, onChange: onDefaultCcChange, value: defaultCc },
      subject: { ref: subjectRef, onChange: onSubjectChange, value: subject },
    };

    const target = lastFocusedGmailField.current;
    if (!target) {
      // Default: append to CC
      onDefaultCcChange(defaultCc ? `${defaultCc}, ${insertion}` : insertion);
      return;
    }

    const field = fieldMap[target];
    const input = field.ref.current;
    if (input) {
      const start = input.selectionStart ?? field.value.length;
      const end = input.selectionEnd ?? field.value.length;
      const newValue = field.value.slice(0, start) + insertion + field.value.slice(end);
      field.onChange(newValue);
      setTimeout(() => {
        input.focus();
        const newPos = start + insertion.length;
        input.setSelectionRange(newPos, newPos);
      }, 0);
    } else {
      field.onChange(field.value ? `${field.value}, ${insertion}` : insertion);
    }
  }, [defaultFrom, defaultTo, defaultCc, subject, onDefaultFromChange, onDefaultToChange, onDefaultCcChange, onSubjectChange]);

  // Extract editable content from HTML for visual editor
  const [editableContent, setEditableContent] = useState("");
  const [lastExtractedTemplateId, setLastExtractedTemplateId] = useState<string | undefined>();

  // Extract content when template changes (not on every bodyHtml change to avoid overwriting user edits)
  useEffect(() => {
    // Only re-extract when switching templates, not on every edit
    if (templateId !== lastExtractedTemplateId || (!templateId && isCreating && editableContent === "")) {
      setLastExtractedTemplateId(templateId);
      extractContentFromHtml(bodyHtml);
    }
  }, [templateId, isCreating]);

  // Also re-extract when switching from HTML editor to visual editor
  const extractContentFromHtml = (html: string) => {
    // Helper to clean HTML to plain text
    const cleanHtmlToText = (rawHtml: string): string => {
      return rawHtml
        // Remove style/script tags entirely
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        // Convert block elements to single newlines
        .replace(/<\/?(h[1-6]|div|tr|table|thead|tbody)[^>]*>/gi, '\n')
        // Convert paragraphs and list items to single newlines
        .replace(/<\/(p|li)>/gi, '\n')
        .replace(/<(p|li)[^>]*>/gi, '')
        // Convert br to single newline
        .replace(/<br\s*\/?>/gi, '\n')
        // Remove all remaining tags
        .replace(/<[^>]+>/g, '')
        // Decode HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // Collapse multiple spaces into one
        .replace(/[ \t]+/g, ' ')
        // Collapse 3+ newlines into 2 (preserves paragraph breaks)
        .replace(/\n{3,}/g, '\n\n')
        // Trim lines
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .trim();
    };

    // Extract the main content from the email body for visual editing
    const contentMatch = html.match(/<!-- Content -->([\s\S]*?)<!-- Footer -->/);
    if (contentMatch) {
      // Extract just the inner content from the td tag
      const tdMatch = contentMatch[1].match(/<td[^>]*>([\s\S]*?)<\/td>/);
      if (tdMatch) {
        setEditableContent(cleanHtmlToText(tdMatch[1]));
        return;
      }
    }
    // Fallback: if no content markers found, try to extract from the whole body
    if (html) {
      setEditableContent(cleanHtmlToText(html));
    }
  };

  // Update HTML when editable content changes (for visual editor)
  const handleContentChange = (newContent: string) => {
    setEditableContent(newContent);

    // Convert plain text back to HTML paragraphs
    const paragraphs = newContent.split(/\n\n+/).filter(p => p.trim());
    const htmlParagraphs = paragraphs.map(p => {
      // Check if it's a greeting line
      if (p.trim().startsWith('Hi ') || p.trim().startsWith('Hello ') || p.trim().startsWith('Dear ')) {
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
      }
      // Check if it's the signature
      if (p.includes('Best regards') || p.includes('Sincerely') || p.includes('Thanks')) {
        return `<p style="margin-top: 24px; color: #6b7280; font-size: 14px;">${p.replace(/\n/g, '<br>')}</p>`;
      }
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('\n\n              ');

    // Replace the content section in the HTML
    const newBody = bodyHtml.replace(
      /(<!-- Content -->[\s\S]*?<td[^>]*>)([\s\S]*?)(<\/td>[\s\S]*?<!-- Footer -->)/,
      `$1\n              ${htmlParagraphs}\n            $3`
    );

    onBodyChange(newBody);
  };

  // Debounced preview update
  useEffect(() => {
    if (activeTab !== "preview") return;

    const timer = setTimeout(async () => {
      if (!subject && !bodyHtml) return;

      setIsPreviewLoading(true);
      try {
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
        setRenderedSubject(subject);
        setRenderedBody(bodyHtml);
      } finally {
        setIsPreviewLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [subject, bodyHtml, templateId, activeTab]);

  const handleInsertVariable = (variable: string) => {
    const insertion = `{{${variable}}}`;
    if (showHtmlEditor && bodyTextareaRef.current) {
      const textarea = bodyTextareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = bodyHtml.slice(0, start) + insertion + bodyHtml.slice(end);
      onBodyChange(newValue);
      // Reset cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + insertion.length, start + insertion.length);
      }, 0);
    } else if (visualTextareaRef.current) {
      const textarea = visualTextareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = editableContent.slice(0, start) + insertion + editableContent.slice(end);
      setEditableContent(newContent);
      handleContentChange(newContent);
      setTimeout(() => {
        textarea.focus();
        const newPos = start + insertion.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    } else {
      setEditableContent(editableContent + insertion);
      handleContentChange(editableContent + insertion);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-1 bg-white rounded-lg p-1 border">
          <button
            onClick={() => setActiveTab("edit")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "edit"
                ? "bg-brand-navy text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <PencilSquareIcon className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "preview"
                ? "bg-brand-navy text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <EyeIcon className="h-4 w-4" />
            Preview
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Save Status */}
          {saveStatus === "saving" && (
            <span className="text-sm text-gray-500">Saving...</span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircleIcon className="h-4 w-4" />
              Saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1 text-sm text-red-600">
              <ExclamationCircleIcon className="h-4 w-4" />
              Error
            </span>
          )}

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
            disabled={saveStatus === "saving"}
            className="px-4 py-1.5 text-sm bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors disabled:opacity-50"
          >
            {isCreating ? "Create Template" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "edit" ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {isSystem && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                This is a system template. You can edit the content, but the template cannot be deleted.
              </div>
            )}

            {/* Delivery Method Indicator */}
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              defaultTo ? "bg-red-50/50 border-red-200" : "bg-amber-50/50 border-amber-200"
            }`}>
              {defaultTo ? (
                <>
                  <span className="text-sm font-medium text-red-700">Sent via Gmail</span>
                  <span className="text-xs text-red-500">Appears in sender&apos;s Gmail sent folder. Used for vendor introductions linked to onboarding modules.</span>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-amber-700">Sent via Postmark</span>
                  <span className="text-xs text-amber-500">System transactional email. Used for notifications, password resets, and admin alerts.</span>
                </>
              )}
            </div>

            {/* Template Info */}
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
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent text-sm"
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
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Subject Line */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject Line
              </label>
              <input
                ref={subjectRef}
                type="text"
                value={subject}
                onChange={(e) => onSubjectChange(e.target.value)}
                onFocus={() => { lastFocusedGmailField.current = "subject"; }}
                placeholder="e.g., Welcome to Peskids Franchise, {{firstName}}!"
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                {defaultTo
                  ? <>Use {"{{franchiseeFirstName}}"}, {"{{franchiseeName}}"}, {"{{marketName}}"}, etc. for personalization</>
                  : <>Use {"{{firstName}}"}, {"{{lastName}}"}, {"{{territory}}"}, etc. for personalization</>
                }
              </p>
            </div>

            {/* Gmail Send Settings */}
            <div className="border rounded-lg p-4 bg-gray-50/50 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-medium text-gray-700">Gmail Send Settings</h4>
                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  {defaultTo ? "Active — this template sends via Gmail" : "Fill in To address to send via Gmail instead of Postmark"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                  <input
                    ref={gmailFromRef}
                    type="text"
                    value={defaultFrom}
                    onChange={(e) => onDefaultFromChange(e.target.value)}
                    onFocus={() => { lastFocusedGmailField.current = "from"; }}
                    placeholder="franchising@peskids.com"
                    className="w-full px-2.5 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                  <input
                    ref={gmailToRef}
                    type="text"
                    value={defaultTo}
                    onChange={(e) => onDefaultToChange(e.target.value)}
                    onFocus={() => { lastFocusedGmailField.current = "to"; }}
                    placeholder="vendor@example.com"
                    className="w-full px-2.5 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CC</label>
                  <input
                    ref={gmailCcRef}
                    type="text"
                    value={defaultCc}
                    onChange={(e) => onDefaultCcChange(e.target.value)}
                    onFocus={() => { lastFocusedGmailField.current = "cc"; }}
                    placeholder="{{franchiseeEmail}}"
                    className="w-full px-2.5 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 mb-1.5">Click a field above, then click a variable to insert it:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: "franchiseeEmail", label: "Franchisee Email" },
                    { key: "franchiseeName", label: "Franchisee Name" },
                    { key: "franchiseeFirstName", label: "First Name" },
                    { key: "franchiseeLastName", label: "Last Name" },
                    { key: "marketName", label: "Market" },
                    { key: "moduleName", label: "Module" },
                  ].map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariableAtCursor(v.key)}
                      className="px-2 py-1 text-[11px] font-medium bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 rounded-md hover:bg-brand-cyan/20 hover:border-brand-cyan/40 transition-colors cursor-pointer"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Email Body */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Email Body
                </label>
                <div className="flex items-center gap-2">
                  <VariableInserter onInsert={handleInsertVariable} mode={defaultTo ? "gmail" : "postmark"} />
                  <button
                    onClick={() => {
                      if (showHtmlEditor) {
                        // Switching from HTML to Visual - re-extract content
                        extractContentFromHtml(bodyHtml);
                      }
                      setShowHtmlEditor(!showHtmlEditor);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      showHtmlEditor
                        ? "bg-brand-navy text-white border-brand-navy"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <CodeBracketIcon className="h-3.5 w-3.5" />
                    {showHtmlEditor ? "Visual Editor" : "HTML Editor"}
                  </button>
                </div>
              </div>

              {showHtmlEditor ? (
                /* HTML Editor */
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 font-mono">
                    HTML Source
                  </div>
                  <textarea
                    ref={bodyTextareaRef}
                    value={bodyHtml}
                    onChange={(e) => onBodyChange(e.target.value)}
                    className="w-full h-[500px] px-4 py-3 font-mono text-sm bg-gray-900 text-gray-100 focus:outline-none resize-none"
                    spellCheck={false}
                  />
                </div>
              ) : (
                /* Visual Editor */
                <div className="border rounded-lg overflow-hidden">
                  {/* Email Header Preview */}
                  <div className="bg-gradient-to-r from-brand-navy to-brand-purple p-4 text-center">
                    <div className="w-32 h-8 bg-white/20 rounded mx-auto" />
                  </div>

                  {/* Editable Content Area */}
                  <div className="p-6 bg-white">
                    <textarea
                      ref={visualTextareaRef}
                      value={editableContent}
                      onChange={(e) => handleContentChange(e.target.value)}
                      placeholder={`Hi {{firstName}},

Write your email content here...

Use {{variables}} for personalization like {{firstName}}, {{lastName}}, {{territory}}, etc.

Best regards,
The Peskids Franchise Team`}
                      className="w-full min-h-[300px] text-sm leading-relaxed focus:outline-none resize-none border-0 p-0"
                      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                    />
                  </div>

                  {/* Email Footer Preview */}
                  <div className="bg-gradient-to-r from-brand-navy to-brand-purple p-4 text-center">
                    <p className="text-sm text-white font-semibold">Peskids Franchise Franchising</p>
                    <p className="text-xs text-brand-cyan mt-1">franchising@peskids.com</p>
                  </div>
                </div>
              )}

              <p className="mt-2 text-xs text-gray-500">
                {showHtmlEditor
                  ? "Edit the raw HTML of the email template. Be careful to maintain proper HTML structure."
                  : "Edit the main content of your email. The header and footer are automatically included."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Preview Tab */
        <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
          <div className="max-w-3xl mx-auto">
            {/* Email Client Mockup */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Email Client Header */}
              <div className="bg-gray-50 px-6 py-4 border-b">
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-gray-500 w-16">From:</span>
                    <div>
                      <span className="text-sm text-gray-900">Peskids Franchise Franchising</span>
                      <span className="text-sm text-gray-400 ml-2">&lt;franchising@peskids.com&gt;</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-gray-500 w-16">To:</span>
                    <span className="text-sm text-gray-900">john.smith@example.com</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-gray-500 w-16">Subject:</span>
                    <span className="text-sm text-gray-900 font-medium">{renderedSubject || "(No subject)"}</span>
                  </div>
                </div>
              </div>

              {/* Email Body */}
              <div className="relative">
                {isPreviewLoading && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
                  </div>
                )}

                {renderedBody ? (
                  <iframe
                    srcDoc={renderedBody}
                    className="w-full border-0"
                    style={{ minHeight: '600px', height: 'calc(100vh - 350px)' }}
                    sandbox="allow-same-origin"
                    title="Email Preview"
                  />
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    Enter content to see preview
                  </div>
                )}
              </div>
            </div>

            {/* Sample Data Info */}
            <div className="mt-4 p-4 bg-white rounded-lg border">
              <p className="text-xs font-medium text-gray-700 mb-2">Sample data used for preview:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-500">
                <div><span className="font-medium">firstName:</span> John</div>
                <div><span className="font-medium">lastName:</span> Smith</div>
                <div><span className="font-medium">email:</span> john.smith@example.com</div>
                <div><span className="font-medium">territory:</span> Austin, TX</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
