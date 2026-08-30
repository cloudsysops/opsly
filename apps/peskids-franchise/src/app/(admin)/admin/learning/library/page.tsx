"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  FolderIcon,
  LinkIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";

interface Resource {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  fileUrl: string | null;
  externalUrl: string | null;
  content: string | null;
  isPublic: boolean;
  createdAt: string;
}

const categoryLabels: Record<string, string> = {
  OPERATIONS: "Operations",
  MARKETING: "Marketing",
  SALES: "Sales",
  TRAINING: "Training",
  LEGAL: "Legal",
  FINANCIAL: "Financial",
  TEMPLATES: "Templates",
};

const categoryColors: Record<string, string> = {
  OPERATIONS: "bg-blue-100 text-blue-800",
  MARKETING: "bg-purple-100 text-purple-800",
  SALES: "bg-green-100 text-green-800",
  TRAINING: "bg-cyan-100 text-cyan-800",
  LEGAL: "bg-red-100 text-red-800",
  FINANCIAL: "bg-yellow-100 text-yellow-800",
  TEMPLATES: "bg-gray-100 text-gray-800",
};

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");

  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "OPERATIONS",
    fileUrl: "",
    externalUrl: "",
    content: "",
    isPublic: false,
  });
  const [saving, setSaving] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter) params.set("category", categoryFilter);

      const res = await fetch(`/api/admin/bootcamp/resources?${params}`);
      const data = await res.json();
      setResources(data.resources || []);
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const startNew = () => {
    setEditingResource(null);
    setForm({
      title: "",
      description: "",
      category: "OPERATIONS",
      fileUrl: "",
      externalUrl: "",
      content: "",
      isPublic: false,
    });
    setUploadedFilename(null);
    setShowEditor(true);
  };

  const startEdit = (resource: Resource) => {
    setEditingResource(resource);
    setForm({
      title: resource.title,
      description: resource.description,
      category: resource.category,
      fileUrl: resource.fileUrl || "",
      externalUrl: resource.externalUrl || "",
      content: resource.content || "",
      isPublic: resource.isPublic,
    });
    // Show existing filename derived from URL if one exists
    if (resource.fileUrl) {
      const parts = resource.fileUrl.split("/");
      setUploadedFilename(parts[parts.length - 1] || "Uploaded file");
    } else {
      setUploadedFilename(null);
    }
    setShowEditor(true);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/resources/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg(data.error || "Upload failed");
        return;
      }
      setForm((prev) => ({ ...prev, fileUrl: data.url }));
      setUploadedFilename(data.filename);
    } catch {
      setAlertMsg("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = "";
  };

  const saveResource = async () => {
    try {
      setSaving(true);
      const url = editingResource
        ? `/api/admin/bootcamp/resources/${editingResource.id}`
        : "/api/admin/bootcamp/resources";
      const method = editingResource ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setAlertMsg(data.error || "Failed to save resource");
        return;
      }

      await fetchResources();
      setShowEditor(false);
    } catch (error) {
      console.error("Failed to save resource:", error);
      setAlertMsg("Failed to save resource");
    } finally {
      setSaving(false);
    }
  };

  const deleteResource = async (resource: Resource) => {
    setDeleteTarget(resource);
  };

  const confirmDeleteResource = async () => {
    if (!deleteTarget) return;
    const resource = deleteTarget;
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/admin/bootcamp/resources/${resource.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setAlertMsg(data.error || "Failed to delete resource");
        return;
      }

      await fetchResources();
    } catch (error) {
      console.error("Failed to delete resource:", error);
      setAlertMsg("Failed to delete resource");
    }
  };

  const groupedResources = resources.reduce((acc, resource) => {
    const category = resource.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(resource);
    return acc;
  }, {} as Record<string, Resource[]>);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">
            Resource Library
          </h1>
          <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-gray-600">
            Downloadable files, templates, checklists, and tools for franchisees
          </p>
        </div>
        <button
          onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-lg text-sm font-medium hover:bg-brand-purple transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Resource
        </button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Filter by category:</span>
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-purple focus:border-transparent bg-white"
              >
                <option value="">All Categories</option>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resources List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
        </div>
      ) : resources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No resources found</p>
            <button
              onClick={startNew}
              className="mt-2 text-sm text-brand-purple hover:underline"
            >
              Add your first resource
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedResources).map(([category, categoryResources]) => (
            <Card key={category}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      categoryColors[category] || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {categoryLabels[category] || category}
                  </span>
                  <span className="text-sm text-gray-500">
                    {categoryResources.length} resources
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {categoryResources.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {resource.externalUrl || resource.fileUrl ? (
                          <LinkIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <DocumentTextIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">
                            {resource.title}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {resource.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {resource.isPublic ? (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <EyeIcon className="h-3 w-3" />
                            Public
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <EyeSlashIcon className="h-3 w-3" />
                            Private
                          </span>
                        )}
                        <button
                          onClick={() => startEdit(resource)}
                          className="p-2 hover:bg-gray-200 rounded-lg"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => deleteResource(resource)}
                          className="p-2 hover:bg-red-100 rounded-lg"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!alertMsg}
        title="Notice"
        message={alertMsg || ""}
        confirmLabel="OK"
        cancelLabel=""
        confirmVariant="primary"
        onConfirm={() => setAlertMsg(null)}
        onCancel={() => setAlertMsg(null)}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Resource"
        message={deleteTarget ? `Delete resource "${deleteTarget.title}"? This cannot be undone.` : ""}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={confirmDeleteResource}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-brand-navy">
                {editingResource ? "Edit Resource" : "New Resource"}
              </h2>
              <button
                onClick={() => setShowEditor(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent bg-white"
                  >
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                />
              </div>

              {/* File upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload File (optional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,.csv"
                  className="hidden"
                  onChange={handleFileInput}
                />
                {uploadedFilename ? (
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg">
                    <DocumentArrowDownIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-green-800 flex-1 truncate">{uploadedFilename}</span>
                    <button
                      type="button"
                      onClick={() => { setUploadedFilename(null); setForm({ ...form, fileUrl: "" }); }}
                      className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-brand-navy hover:underline flex-shrink-0"
                    >
                      Replace
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      dragOver
                        ? "border-brand-navy bg-blue-50"
                        : "border-gray-300 hover:border-brand-navy hover:bg-gray-50"
                    }`}
                  >
                    {uploading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-navy" />
                        Uploading…
                      </div>
                    ) : (
                      <>
                        <ArrowUpTrayIcon className="h-6 w-6 text-gray-400" />
                        <p className="text-sm text-gray-500">
                          <span className="font-medium text-brand-navy">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-400">PDF, Word, Excel, PowerPoint, JPG, PNG, ZIP, CSV — up to 50 MB</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  External URL (optional)
                </label>
                <input
                  type="url"
                  value={form.externalUrl}
                  onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                  placeholder="https://… (Google Drive, Dropbox, etc.)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content (optional)
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent font-mono text-sm"
                  placeholder="Inline content (Markdown/HTML supported)..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={form.isPublic}
                  onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                  className="h-4 w-4 text-brand-purple focus:ring-brand-purple border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-700">
                  Make this resource visible to all selected franchisees
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveResource}
                disabled={saving || !form.title || !form.description}
                className="px-4 py-2 bg-brand-navy text-white rounded-lg text-sm font-medium hover:bg-brand-purple transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : editingResource ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
