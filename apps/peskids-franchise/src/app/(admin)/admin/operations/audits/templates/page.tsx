"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { Card, CardContent } from "@/components/shared/Card";
import {
  ClipboardDocumentCheckIcon,
  PlusIcon,
  PencilSquareIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

interface AuditTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isActive: boolean;
  itemCount: number;
  createdAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  BRAND_STANDARDS: "bg-purple-100 text-purple-800",
  OPERATIONS: "bg-blue-100 text-blue-800",
  SAFETY: "bg-red-100 text-red-800",
  MARKETING: "bg-green-100 text-green-800",
  CUSTOMER_EXPERIENCE: "bg-amber-100 text-amber-800",
};

const CATEGORY_LABELS: Record<string, string> = {
  BRAND_STANDARDS: "Brand Standards",
  OPERATIONS: "Operations",
  SAFETY: "Safety",
  MARKETING: "Marketing",
  CUSTOMER_EXPERIENCE: "Customer Experience",
};

export default function AuditTemplatesPage() {
  const [templates, setTemplates] = useState<AuditTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/admin/operations/audits/templates");
      const json = await res.json();
      setTemplates(json.templates || []);
    } catch (err) {
      console.error("Error fetching templates:", err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(templateId: string, isActive: boolean) {
    try {
      await fetch(`/api/admin/operations/audits/templates/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === templateId ? { ...t, isActive: !isActive } : t
        )
      );
    } catch (err) {
      console.error("Error toggling template:", err);
    }
  }

  return (
    <WideContainer className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="h-7 w-7 text-indigo-600" />
            Audit Templates
          </h1>
          <p className="mt-1 text-gray-600">
            Create and manage reusable audit checklists
          </p>
        </div>
        <Link
          href="/admin/operations/audits/templates/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <PlusIcon className="h-4 w-4" />
          New Template
        </Link>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-xl" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No audit templates yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Create your first template to start conducting audits.
            </p>
            <Link
              href="/admin/operations/audits/templates/new"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              <PlusIcon className="h-4 w-4" />
              New Template
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={`transition-opacity ${
                !template.isActive ? "opacity-60" : ""
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {template.name}
                    </h3>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                        CATEGORY_COLORS[template.category] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {CATEGORY_LABELS[template.category] || template.category}
                    </span>
                  </div>
                  {!template.isActive && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded font-medium">
                      Inactive
                    </span>
                  )}
                </div>

                {template.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {template.description}
                  </p>
                )}

                <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
                  <DocumentTextIcon className="h-4 w-4" />
                  <span>{template.itemCount} items</span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <button
                    onClick={() => toggleActive(template.id, template.isActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      template.isActive ? "bg-indigo-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        template.isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <Link
                    href={`/admin/operations/audits/templates/${template.id}/edit`}
                    className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                    Edit
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </WideContainer>
  );
}
