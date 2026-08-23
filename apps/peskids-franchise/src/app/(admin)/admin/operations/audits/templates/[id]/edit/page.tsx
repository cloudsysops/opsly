"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { Card, CardHeader, CardContent } from "@/components/shared/Card";
import {
  ArrowLeftIcon,
  ClipboardDocumentCheckIcon,
  PlusIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface TemplateItem {
  id: string;
  question: string;
  description: string;
  itemType: string;
  weight: number;
  isRequired: boolean;
  sortOrder: number;
  isNew?: boolean;
}

const ITEM_TYPES = [
  { value: "PASS_FAIL", label: "Pass / Fail" },
  { value: "RATING_1_5", label: "Rating (1-5)" },
  { value: "YES_NO", label: "Yes / No" },
  { value: "TEXT", label: "Text Response" },
  { value: "PHOTO", label: "Photo URL" },
];

const CATEGORIES = [
  { value: "BRAND_STANDARDS", label: "Brand Standards" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "SAFETY", label: "Safety" },
  { value: "MARKETING", label: "Marketing" },
  { value: "CUSTOMER_EXPERIENCE", label: "Customer Experience" },
];

let itemCounter = 0;
function generateTempId(): string {
  itemCounter += 1;
  return `temp-${Date.now()}-${itemCounter}`;
}

export default function EditAuditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "BRAND_STANDARDS",
    description: "",
  });

  const [items, setItems] = useState<TemplateItem[]>([]);

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  async function fetchTemplate() {
    try {
      const res = await fetch(`/api/admin/operations/audits/templates/${templateId}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to load template");
        return;
      }

      const template = json.template;
      setForm({
        name: template.name,
        category: template.category,
        description: template.description || "",
      });

      setItems(
        (template.items || []).map((item: TemplateItem) => ({
          ...item,
          description: item.description || "",
        }))
      );
    } catch (err) {
      console.error("Error fetching template:", err);
      setError("Failed to load template");
    } finally {
      setLoading(false);
    }
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: generateTempId(),
        question: "",
        description: "",
        itemType: "PASS_FAIL",
        weight: 1,
        isRequired: true,
        sortOrder: prev.length,
        isNew: true,
      },
    ]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateItem(id: string, field: keyof TemplateItem, value: string | number | boolean) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  function moveItem(index: number, direction: "up" | "down") {
    const newItems = [...items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems.map((item, i) => ({ ...item, sortOrder: i })));
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError("Template name is required.");
      return;
    }

    const validItems = items.filter((item) => item.question.trim());
    if (validItems.length === 0) {
      setError("At least one checklist item with a question is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/operations/audits/templates/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: validItems.map((item, index) => ({
            id: item.isNew ? undefined : item.id,
            question: item.question,
            description: item.description || null,
            itemType: item.itemType,
            weight: item.weight,
            isRequired: item.isRequired,
            sortOrder: index,
          })),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to update template");
        return;
      }

      router.push("/admin/operations/audits/templates");
    } catch (err) {
      console.error("Error updating template:", err);
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/operations/audits/templates/${templateId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to delete template");
        setShowDeleteModal(false);
        return;
      }

      router.push("/admin/operations/audits/templates");
    } catch (err) {
      console.error("Error deleting template:", err);
      setError("Failed to delete template");
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <WideContainer className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </WideContainer>
    );
  }

  return (
    <WideContainer className="space-y-6 max-w-4xl">
      {/* Back Link */}
      <Link
        href="/admin/operations/audits/templates"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Templates
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="h-7 w-7 text-indigo-600" />
            Edit Template
          </h1>
          <p className="mt-1 text-gray-600">
            Update this audit template and its checklist items
          </p>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
        >
          Delete Template
        </button>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Template Details */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">Template Details</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Brand Standards Audit Q1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Describe the purpose of this audit template..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Checklist Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand-navy">
              Checklist Items ({items.length})
            </h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="p-4 rounded-lg border border-gray-200 bg-gray-50"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-500">
                  Item {index + 1}
                  {item.isNew && (
                    <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                      New
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveItem(index, "up")}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="Move up"
                  >
                    <ChevronUpIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveItem(index, "down")}
                    disabled={index === items.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="Move down"
                  >
                    <ChevronDownIcon className="h-4 w-4" />
                  </button>
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-red-400 hover:text-red-600"
                      title="Remove item"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Question <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={item.question}
                    onChange={(e) => updateItem(item.id, "question", e.target.value)}
                    className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Is the STC logo displayed prominently?"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Additional context for the auditor..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Type</label>
                    <select
                      value={item.itemType}
                      onChange={(e) => updateItem(item.id, "itemType", e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {ITEM_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Weight</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={item.weight}
                      onChange={(e) =>
                        updateItem(item.id, "weight", parseInt(e.target.value) || 1)
                      }
                      className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2 pb-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.isRequired}
                        onChange={(e) =>
                          updateItem(item.id, "isRequired", e.target.checked)
                        }
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Required</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addItem}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Add Item
          </button>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                Delete Template
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-600">
                Are you sure you want to delete <strong>{form.name}</strong>? This action cannot be undone. Any audits using this template will retain their data but the template will no longer be available for new audits.
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Delete Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </WideContainer>
  );
}
