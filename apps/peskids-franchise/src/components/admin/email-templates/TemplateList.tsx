"use client";

import { EnvelopeIcon } from "@heroicons/react/24/outline";

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

interface TemplateListProps {
  templates: EmailTemplate[];
  selectedId?: string;
  onSelect: (template: EmailTemplate) => void;
  isCreating: boolean;
}

const categoryLabels: Record<string, string> = {
  PROSPECT: "Prospect",
  ADMIN: "Admin",
  DOCUMENT: "Document",
  CUSTOM: "Custom",
};

const categoryColors: Record<string, string> = {
  PROSPECT: "bg-brand-cyan text-white",
  ADMIN: "bg-brand-orange text-white",
  DOCUMENT: "bg-brand-purple text-white",
  CUSTOM: "bg-gray-500 text-white",
};

export function TemplateList({ templates, selectedId, onSelect, isCreating }: TemplateListProps) {
  // Group templates by category
  const grouped = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

  const categoryOrder = ["PROSPECT", "ADMIN", "DOCUMENT", "CUSTOM"];
  const orderedCategories = categoryOrder.filter(cat => grouped[cat]?.length > 0);

  return (
    <div className="p-4 space-y-6">
      {/* New template indicator */}
      {isCreating && (
        <div className="p-3 bg-brand-navy/10 border-2 border-brand-navy rounded-lg">
          <div className="flex items-center gap-2 text-brand-navy font-medium">
            <EnvelopeIcon className="w-4 h-4" />
            New Template
          </div>
        </div>
      )}

      {orderedCategories.map((category) => (
        <div key={category}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${categoryColors[category]}`}>
              {categoryLabels[category] || category}
            </span>
          </div>

          <div className="space-y-1">
            {grouped[category].map((template) => (
              <button
                key={template.id}
                onClick={() => onSelect(template)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedId === template.id && !isCreating
                    ? "bg-brand-navy text-white"
                    : "hover:bg-gray-100"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {template.name}
                    </div>
                    {template.description && (
                      <div className={`text-xs mt-0.5 truncate ${
                        selectedId === template.id && !isCreating ? "text-white/70" : "text-gray-500"
                      }`}>
                        {template.description}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {template.defaultTo ? (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        selectedId === template.id && !isCreating
                          ? "bg-white/20 text-white"
                          : "bg-red-50 text-red-600 border border-red-200"
                      }`}>
                        Gmail
                      </span>
                    ) : (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        selectedId === template.id && !isCreating
                          ? "bg-white/20 text-white"
                          : "bg-amber-50 text-amber-600 border border-amber-200"
                      }`}>
                        Postmark
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {templates.length === 0 && !isCreating && (
        <div className="text-center text-gray-500 py-8">
          No templates found
        </div>
      )}
    </div>
  );
}
