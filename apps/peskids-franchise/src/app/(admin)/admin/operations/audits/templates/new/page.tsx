"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
} from "@heroicons/react/24/outline";

interface TemplateItem {
  id: string;
  question: string;
  description: string;
  itemType: string;
  weight: number;
  isRequired: boolean;
  sortOrder: number;
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

export default function NewAuditTemplatePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    category: "BRAND_STANDARDS",
    description: "",
  });

  const [items, setItems] = useState<TemplateItem[]>([
    {
      id: generateTempId(),
      question: "",
      description: "",
      itemType: "PASS_FAIL",
      weight: 1,
      isRequired: true,
      sortOrder: 0,
    },
  ]);

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
      const res = await fetch("/api/admin/operations/audits/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: validItems.map((item, index) => ({
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
        setError(json.error || "Failed to create template");
        return;
      }

      router.push("/admin/operations/audits/templates");
    } catch (err) {
      console.error("Error creating template:", err);
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy flex items-center gap-2">
          <ClipboardDocumentCheckIcon className="h-7 w-7 text-indigo-600" />
          Create Audit Template
        </h1>
        <p className="mt-1 text-gray-600">
          Define a reusable checklist for field audits
        </p>
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
          {submitting ? "Creating..." : "Create Template"}
        </button>
      </div>
    </WideContainer>
  );
}
