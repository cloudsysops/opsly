"use client";

import { useState, useEffect, useCallback } from "react";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { TemplateList } from "@/components/admin/email-templates/TemplateList";
import { TemplateEditorPanel } from "@/components/admin/email-templates/TemplateEditorPanel";

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  subject: string;
  bodyHtml?: string;
  variables: string[];
  isSystem: boolean;
  isActive: boolean;
  defaultTo: string | null;
  defaultCc: string | null;
  defaultFrom: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    sentEmails: number;
  };
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Current editor state
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedDefaultTo, setEditedDefaultTo] = useState("");
  const [editedDefaultCc, setEditedDefaultCc] = useState("");
  const [editedDefaultFrom, setEditedDefaultFrom] = useState("");

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/email-templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      const data = await res.json();
      setTemplates(data.templates);
    } catch {
      setError("Failed to load email templates");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSelectTemplate = async (template: EmailTemplate) => {
    // Fetch full template with body
    try {
      const res = await fetch(`/api/admin/email-templates/${template.id}`);
      if (!res.ok) throw new Error("Failed to fetch template");
      const data = await res.json();
      const fullTemplate = data.template;

      setSelectedTemplate(fullTemplate);
      setEditedSubject(fullTemplate.subject);
      setEditedBody(fullTemplate.bodyHtml);
      setEditedName(fullTemplate.name);
      setEditedDescription(fullTemplate.description || "");
      setEditedDefaultTo(fullTemplate.defaultTo || "");
      setEditedDefaultCc(fullTemplate.defaultCc || "");
      setEditedDefaultFrom(fullTemplate.defaultFrom || "");
      setIsCreating(false);
      setSaveStatus("idle");
    } catch {
      setError("Failed to load template details");
    }
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setIsCreating(true);
    setEditedSubject("");
    setEditedBody(getBlankTemplate());
    setEditedName("");
    setEditedDescription("");
    setEditedDefaultTo("");
    setEditedDefaultCc("");
    setEditedDefaultFrom("");
    setSaveStatus("idle");
  };

  const handleSave = async () => {
    setSaveStatus("saving");

    if (isCreating) {
      // Create new template
      const slug = editedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      try {
        const res = await fetch("/api/admin/email-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            name: editedName,
            description: editedDescription || null,
            category: "CUSTOM",
            subject: editedSubject,
            bodyHtml: editedBody,
            variables: extractVariables(editedBody + editedSubject),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create template");
        }

        await fetchTemplates();
        setIsCreating(false);
        setError(null);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create template");
        setSaveStatus("error");
      }
    } else if (selectedTemplate) {
      // Update existing template
      try {
        const res = await fetch(`/api/admin/email-templates/${selectedTemplate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editedName,
            description: editedDescription || null,
            subject: editedSubject,
            bodyHtml: editedBody,
            variables: extractVariables(editedBody + editedSubject),
          }),
        });

        if (!res.ok) throw new Error("Failed to update template");

        await fetchTemplates();
        setError(null);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setError("Failed to save template");
        setSaveStatus("error");
      }
    }
  };

  const handleDelete = () => {
    if (!selectedTemplate || selectedTemplate.isSystem) return;
    setShowDeleteConfirm(true);
  };

  const doDelete = async () => {
    setShowDeleteConfirm(false);
    if (!selectedTemplate) return;

    try {
      const res = await fetch(`/api/admin/email-templates/${selectedTemplate.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete template");

      await fetchTemplates();
      setSelectedTemplate(null);
      setIsCreating(false);
    } catch {
      setError("Failed to delete template");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Email Templates</h1>
          <p className="text-gray-600">Manage email templates for prospect communications</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors"
        >
          New Template
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex-shrink-0">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Template"
        message="Are you sure you want to delete this template?"
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={doDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Template List - Narrower */}
        <div className="w-80 border-r bg-gray-50 overflow-y-auto flex-shrink-0">
          <TemplateList
            templates={templates}
            selectedId={selectedTemplate?.id}
            onSelect={handleSelectTemplate}
            isCreating={isCreating}
          />
        </div>

        {/* Main Editor Panel - Takes remaining space */}
        <div className="flex-1 overflow-hidden min-w-0">
          {(selectedTemplate || isCreating) ? (
            <TemplateEditorPanel
              key={selectedTemplate?.id || "new"}
              templateId={selectedTemplate?.id}
              isCreating={isCreating}
              isSystem={selectedTemplate?.isSystem || false}
              name={editedName}
              description={editedDescription}
              subject={editedSubject}
              bodyHtml={editedBody}
              defaultTo={editedDefaultTo}
              defaultCc={editedDefaultCc}
              defaultFrom={editedDefaultFrom}
              saveStatus={saveStatus}
              onNameChange={setEditedName}
              onDescriptionChange={setEditedDescription}
              onSubjectChange={setEditedSubject}
              onBodyChange={setEditedBody}
              onDefaultToChange={setEditedDefaultTo}
              onDefaultCcChange={setEditedDefaultCc}
              onDefaultFromChange={setEditedDefaultFrom}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 bg-gray-50">
              <div className="text-center">
                <div className="text-6xl mb-4">📧</div>
                <p className="text-lg font-medium text-gray-700">Select a template to edit</p>
                <p className="text-sm text-gray-500 mt-1">Or create a new one to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper to extract variables from template
function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g) || [];
  const vars = matches.map(m => m.replace(/\{\{|\}\}/g, ""));
  return [...new Set(vars)];
}

// Blank template with the email wrapper
function getBlankTemplate(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #E8FBFF;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #E8FBFF; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(45,47,142,0.1);">
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #2D2F8E 0%, #6A469D 100%); padding: 32px; text-align: center;">
              <img src="https://via.placeholder.com/180x60?text=Peskids+Franchise" alt="Peskids Franchise" width="180" style="display: block; margin: 0 auto;" />
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333;">
              <p>Hi {{firstName}},</p>

              <p>Your message here...</p>

              <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
                Best regards,<br>
                The Peskids Franchise Team
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, #2D2F8E 0%, #6A469D 100%); padding: 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 14px; color: white; font-weight: 600;">
                Peskids Franchise Franchising
              </p>
              <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.8);">
                <a href="mailto:franchising@peskids.com" style="color: #50C8DF; text-decoration: none;">franchising@peskids.com</a>
              </p>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
                <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.6);">
                  © {{currentYear}} Peskids Franchise. All rights reserved.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
