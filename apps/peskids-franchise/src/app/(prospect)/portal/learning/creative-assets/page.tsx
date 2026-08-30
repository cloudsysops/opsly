"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { Card, CardContent } from "@/components/shared/Card";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { CanvaEmbed } from "@/components/content/CanvaEmbed";
import {
  FolderIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  DocumentIcon,
  LinkIcon,
  CloudArrowUpIcon,
  ShareIcon,
  CheckBadgeIcon,
  UserIcon,
  SwatchIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AssetUploader {
  id: string;
  firstName: string;
  lastName: string;
}

interface CreativeAsset {
  id: string;
  title: string;
  description: string | null;
  category: string;
  sourceType: "CANVA" | "UPLOAD" | "URL";
  canvaDesignId: string | null;
  canvaEmbedUrl: string | null;
  canvaThumbnailUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  externalUrl: string | null;
  thumbnailUrl: string | null;
  isOfficial: boolean;
  isPublic: boolean;
  sortOrder: number;
  uploadedById: string | null;
  uploadedBy: AssetUploader | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const categoryLabels: Record<string, string> = {
  "": "All",
  LOGOS: "Logos & Branding",
  SOCIAL_MEDIA: "Social Media",
  FLYERS_PRINT: "Flyers & Print",
  EMAIL_TEMPLATES: "Email Templates",
  PRESENTATIONS: "Presentations",
  LEGAL_DOCS: "Legal Docs",
  PHOTOS_MEDIA: "Photos & Media",
  OTHER: "Other",
};

const categoryColors: Record<string, string> = {
  LOGOS: "bg-purple-100 text-purple-700",
  SOCIAL_MEDIA: "bg-blue-100 text-blue-700",
  FLYERS_PRINT: "bg-emerald-100 text-emerald-700",
  EMAIL_TEMPLATES: "bg-amber-100 text-amber-700",
  PRESENTATIONS: "bg-cyan-100 text-cyan-700",
  LEGAL_DOCS: "bg-red-100 text-red-700",
  PHOTOS_MEDIA: "bg-pink-100 text-pink-700",
  OTHER: "bg-gray-100 text-gray-700",
};

const sourceConfig: Record<string, { label: string; color: string }> = {
  CANVA: { label: "Canva", color: "bg-purple-100 text-purple-700" },
  UPLOAD: { label: "Upload", color: "bg-blue-100 text-blue-700" },
  URL: { label: "Link", color: "bg-amber-100 text-amber-700" },
};

const IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isImageMime(mime: string | null): boolean {
  if (!mime) return false;
  return IMAGE_MIMES.includes(mime);
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CreativeAssetsPage() {
  const [activeTab, setActiveTab] = useState<"brand-library" | "my-assets">(
    "brand-library"
  );
  const [category, setCategory] = useState("");
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Detail / preview modal
  const [previewAsset, setPreviewAsset] = useState<CreativeAsset | null>(null);

  // Add / edit modal
  const [showAddEdit, setShowAddEdit] = useState(false);
  const [editingAsset, setEditingAsset] = useState<CreativeAsset | null>(null);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // --------------------------------------------------
  // Fetch
  // --------------------------------------------------

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ tab: activeTab });
      if (category) params.set("category", category);
      const res = await fetch(
        `/api/franchisee/creative-assets?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch assets");
      const data = await res.json();
      setAssets(data.assets ?? []);
    } catch {
      setError("Failed to load assets. Please try again.");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, category]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // --------------------------------------------------
  // Delete handler
  // --------------------------------------------------

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/franchisee/creative-assets/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setDeleteId(null);
      fetchAssets();
    } catch {
      setError("Failed to delete asset.");
    } finally {
      setDeleting(false);
    }
  };

  // --------------------------------------------------
  // Callbacks from add/edit modal
  // --------------------------------------------------

  const handleSaved = () => {
    setShowAddEdit(false);
    setEditingAsset(null);
    fetchAssets();
  };

  const openEdit = (asset: CreativeAsset) => {
    setEditingAsset(asset);
    setShowAddEdit(true);
  };

  const openAdd = () => {
    setEditingAsset(null);
    setShowAddEdit(true);
  };

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  const tabs: { key: "brand-library" | "my-assets"; label: string }[] = [
    { key: "brand-library", label: "Brand Library" },
    { key: "my-assets", label: "My Assets" },
  ];

  return (
    <WideContainer className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">
            Creative Assets
          </h1>
          <p className="mt-1 text-gray-600">
            Browse official brand assets and manage your own uploads
          </p>
        </div>
        {activeTab === "my-assets" && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors text-sm font-medium"
          >
            <PlusIcon className="h-5 w-5" />
            Add Asset
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setActiveTab(t.key);
                setCategory("");
              }}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? "border-b-2 border-brand-navy text-brand-navy font-semibold"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(categoryLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === key
                ? "bg-brand-navy text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-brand-navy rounded-full animate-spin" />
        </div>
      ) : assets.length === 0 ? (
        /* Empty state */
        <Card>
          <CardContent className="py-16 text-center">
            <FolderIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {activeTab === "brand-library"
                ? "No brand assets yet"
                : "You haven't uploaded any assets yet"}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {activeTab === "brand-library"
                ? "Check back later for official brand materials."
                : "Click \"Add Asset\" to upload files or save external links."}
            </p>
            {activeTab === "my-assets" && (
              <button
                onClick={openAdd}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors text-sm font-medium"
              >
                <PlusIcon className="h-4 w-4" />
                Add Your First Asset
              </button>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Asset Grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              isMine={activeTab === "my-assets"}
              onPreview={() => setPreviewAsset(asset)}
              onEdit={() => openEdit(asset)}
              onDelete={() => setDeleteId(asset.id)}
            />
          ))}
        </div>
      )}

      {/* Detail / Preview Modal */}
      {previewAsset && (
        <AssetPreviewModal
          asset={previewAsset}
          onClose={() => setPreviewAsset(null)}
        />
      )}

      {/* Add / Edit Modal */}
      {showAddEdit && (
        <AddEditModal
          asset={editingAsset}
          onClose={() => {
            setShowAddEdit(false);
            setEditingAsset(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Asset"
        message="Are you sure you want to delete this asset? This cannot be undone."
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </WideContainer>
  );
}

// ===========================================================================
// AssetCard
// ===========================================================================

function AssetCard({
  asset,
  isMine,
  onPreview,
  onEdit,
  onDelete,
}: {
  asset: CreativeAsset;
  isMine: boolean;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const src = sourceConfig[asset.sourceType] ?? sourceConfig.URL;

  // Determine thumbnail
  const renderThumbnail = () => {
    if (asset.sourceType === "CANVA" && asset.canvaThumbnailUrl) {
      return (
        <img
          src={asset.canvaThumbnailUrl}
          alt={asset.title}
          className="w-full h-full object-cover"
        />
      );
    }
    if (asset.thumbnailUrl) {
      return (
        <img
          src={asset.thumbnailUrl}
          alt={asset.title}
          className="w-full h-full object-cover"
        />
      );
    }
    if (asset.sourceType === "UPLOAD" && isImageMime(asset.mimeType) && asset.fileUrl) {
      return (
        <img
          src={asset.fileUrl}
          alt={asset.title}
          className="w-full h-full object-cover"
        />
      );
    }
    // Fallback icon
    const Icon =
      asset.sourceType === "CANVA"
        ? SwatchIcon
        : asset.sourceType === "URL"
        ? LinkIcon
        : DocumentIcon;
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <Icon className="h-12 w-12 text-gray-300" />
      </div>
    );
  };

  return (
    <div
      className="group bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
      onClick={onPreview}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {renderThumbnail()}

        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${src.color}`}
          >
            {src.label}
          </span>
          {asset.isOfficial && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-0.5">
              <CheckBadgeIcon className="h-3 w-3" />
              Official
            </span>
          )}
        </div>

        {/* Shared by overlay */}
        {asset.uploadedBy && !asset.isOfficial && (
          <div className="absolute bottom-2 left-2">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/90 text-gray-600 flex items-center gap-0.5">
              <UserIcon className="h-3 w-3" />
              Shared by {asset.uploadedBy.firstName} {asset.uploadedBy.lastName}
            </span>
          </div>
        )}

        {/* Edit / Delete overlay for owned assets */}
        {isMine && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
              title="Edit"
            >
              <PencilIcon className="h-4 w-4 text-gray-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <TrashIcon className="h-4 w-4 text-red-500" />
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 leading-snug">
          {asset.title}
        </h3>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              categoryColors[asset.category] ?? categoryColors.OTHER
            }`}
          >
            {categoryLabels[asset.category] ?? asset.category}
          </span>
          {asset.fileSizeBytes && (
            <span className="text-[10px] text-gray-400">
              {formatBytes(asset.fileSizeBytes)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// AssetPreviewModal
// ===========================================================================

function AssetPreviewModal({
  asset,
  onClose,
}: {
  asset: CreativeAsset;
  onClose: () => void;
}) {
  const src = sourceConfig[asset.sourceType] ?? sourceConfig.URL;

  const renderContent = () => {
    // Canva assets
    if (asset.sourceType === "CANVA" && asset.canvaEmbedUrl) {
      return (
        <div className="space-y-3">
          <CanvaEmbed
            url={asset.canvaEmbedUrl}
            title={asset.title}
            height="600px"
          />
          <a
            href={asset.canvaEmbedUrl.replace("?embed", "")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-brand-purple hover:text-purple-700 font-medium"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            Open in Canva
          </a>
        </div>
      );
    }

    // Upload assets
    if (asset.sourceType === "UPLOAD" && asset.fileUrl) {
      if (isImageMime(asset.mimeType)) {
        return (
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              <img
                src={asset.fileUrl}
                alt={asset.title}
                className="max-w-full max-h-[60vh] mx-auto object-contain"
              />
            </div>
            <a
              href={asset.fileUrl}
              download={asset.fileName ?? "download"}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors text-sm font-medium"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Download
            </a>
          </div>
        );
      }

      // Non-image upload (PDF, etc.)
      return (
        <div className="flex flex-col items-center gap-4 py-8">
          <DocumentIcon className="h-16 w-16 text-gray-300" />
          <div className="text-center">
            <p className="font-medium text-gray-700">
              {asset.fileName ?? "File"}
            </p>
            {asset.fileSizeBytes && (
              <p className="text-sm text-gray-400 mt-1">
                {formatBytes(asset.fileSizeBytes)}
              </p>
            )}
            {asset.mimeType && (
              <p className="text-xs text-gray-400 mt-0.5">{asset.mimeType}</p>
            )}
          </div>
          <a
            href={asset.fileUrl}
            download={asset.fileName ?? "download"}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors text-sm font-medium"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Download File
          </a>
        </div>
      );
    }

    // URL assets
    if (asset.sourceType === "URL" && asset.externalUrl) {
      return (
        <div className="flex flex-col items-center gap-4 py-8">
          <LinkIcon className="h-16 w-16 text-gray-300" />
          <p className="text-sm text-gray-500 text-center break-all max-w-md">
            {asset.externalUrl}
          </p>
          <a
            href={asset.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors text-sm font-medium"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            Open Link
          </a>
        </div>
      );
    }

    return (
      <p className="text-center text-gray-400 py-8">
        No preview available for this asset.
      </p>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg font-semibold text-brand-navy">
              {asset.title}
            </h2>
            {asset.description && (
              <p className="text-sm text-gray-600 mt-1">{asset.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span
                className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${src.color}`}
              >
                {src.label}
              </span>
              <span
                className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                  categoryColors[asset.category] ?? categoryColors.OTHER
                }`}
              >
                {categoryLabels[asset.category] ?? asset.category}
              </span>
              {asset.isOfficial && (
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                  <CheckBadgeIcon className="h-3.5 w-3.5" />
                  Official
                </span>
              )}
            </div>
            {asset.uploadedBy && (
              <p className="text-xs text-gray-400 mt-2">
                Uploaded by {asset.uploadedBy.firstName}{" "}
                {asset.uploadedBy.lastName} on {formatDate(asset.createdAt)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{renderContent()}</div>
      </div>
    </div>
  );
}

// ===========================================================================
// AddEditModal
// ===========================================================================

function AddEditModal({
  asset,
  onClose,
  onSaved,
}: {
  asset: CreativeAsset | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = asset !== null;

  // Sub-tab: only shown when adding
  const [sourceTab, setSourceTab] = useState<"UPLOAD" | "URL">(
    isEditing ? (asset.sourceType as "UPLOAD" | "URL") : "UPLOAD"
  );

  // Form fields
  const [title, setTitle] = useState(asset?.title ?? "");
  const [description, setDescription] = useState(asset?.description ?? "");
  const [categoryVal, setCategoryVal] = useState(asset?.category ?? "OTHER");
  const [isPublic, setIsPublic] = useState(asset?.isPublic ?? false);

  // Upload-specific
  const [uploadedFile, setUploadedFile] = useState<{
    fileUrl: string;
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
  } | null>(
    isEditing && asset.sourceType === "UPLOAD" && asset.fileUrl
      ? {
          fileUrl: asset.fileUrl,
          fileName: asset.fileName ?? "",
          fileSizeBytes: asset.fileSizeBytes ?? 0,
          mimeType: asset.mimeType ?? "",
        }
      : null
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL-specific
  const [externalUrl, setExternalUrl] = useState(asset?.externalUrl ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(asset?.thumbnailUrl ?? "");

  // Saving
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Drag-and-drop
  const [isDragOver, setIsDragOver] = useState(false);

  // --------------------------------------------------
  // Upload handler
  // --------------------------------------------------

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/franchisee/creative-assets/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();
      setUploadedFile(data);
      // Auto-fill title from filename if empty
      if (!title) {
        const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
        setTitle(nameWithoutExt);
      }
    } catch (err: any) {
      setUploadError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // --------------------------------------------------
  // Save handler
  // --------------------------------------------------

  const handleSave = async () => {
    setFormError("");

    // Validate
    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }

    if (sourceTab === "UPLOAD" && !isEditing && !uploadedFile) {
      setFormError("Please upload a file first.");
      return;
    }

    if (sourceTab === "URL" && !externalUrl.trim()) {
      setFormError("URL is required.");
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        // PATCH
        const body: Record<string, unknown> = {
          title: title.trim(),
          description: description.trim() || null,
          category: categoryVal,
          isPublic,
        };
        if (asset.sourceType === "URL") {
          body.externalUrl = externalUrl.trim();
          body.thumbnailUrl = thumbnailUrl.trim() || null;
        }
        const res = await fetch(
          `/api/franchisee/creative-assets/${asset.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update asset");
        }
      } else {
        // POST — create
        const body: Record<string, unknown> = {
          title: title.trim(),
          description: description.trim() || null,
          category: categoryVal,
          sourceType: sourceTab,
          isPublic,
        };
        if (sourceTab === "UPLOAD" && uploadedFile) {
          body.fileUrl = uploadedFile.fileUrl;
          body.fileName = uploadedFile.fileName;
          body.fileSizeBytes = uploadedFile.fileSizeBytes;
          body.mimeType = uploadedFile.mimeType;
        }
        if (sourceTab === "URL") {
          body.externalUrl = externalUrl.trim();
          body.thumbnailUrl = thumbnailUrl.trim() || null;
        }
        const res = await fetch("/api/franchisee/creative-assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create asset");
        }
      }

      onSaved();
    } catch (err: any) {
      setFormError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  const categoryOptions = Object.entries(categoryLabels).filter(
    ([k]) => k !== ""
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-brand-navy">
            {isEditing ? "Edit Asset" : "Add Asset"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Source sub-tabs (only when adding) */}
          {!isEditing && (
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setSourceTab("UPLOAD")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  sourceTab === "UPLOAD"
                    ? "bg-white text-brand-navy shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <CloudArrowUpIcon className="h-4 w-4" />
                Upload File
              </button>
              <button
                onClick={() => setSourceTab("URL")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  sourceTab === "URL"
                    ? "bg-white text-brand-navy shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <LinkIcon className="h-4 w-4" />
                External URL
              </button>
            </div>
          )}

          {/* Upload area */}
          {sourceTab === "UPLOAD" && !isEditing && (
            <div>
              {uploadedFile ? (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-3">
                    {isImageMime(uploadedFile.mimeType) ? (
                      <img
                        src={uploadedFile.fileUrl}
                        alt="Preview"
                        className="h-14 w-14 object-cover rounded-lg border border-gray-200"
                      />
                    ) : (
                      <div className="h-14 w-14 flex items-center justify-center bg-white rounded-lg border border-gray-200">
                        <DocumentIcon className="h-7 w-7 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {uploadedFile.fileName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatBytes(uploadedFile.fileSizeBytes)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setUploadedFile(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragOver
                      ? "border-brand-navy bg-brand-navy/5"
                      : "border-gray-300 hover:border-brand-navy/50 hover:bg-gray-50"
                  }`}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-3 border-gray-200 border-t-brand-navy rounded-full animate-spin" />
                      <p className="text-sm text-gray-500">Uploading...</p>
                    </div>
                  ) : (
                    <>
                      <CloudArrowUpIcon className="h-10 w-10 text-gray-300 mx-auto" />
                      <p className="mt-2 text-sm font-medium text-gray-700">
                        Click or drag file here
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        JPEG, PNG, GIF, WebP, SVG, PDF (max 25MB)
                      </p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf"
                    onChange={handleFileInputChange}
                  />
                </div>
              )}
              {uploadError && (
                <p className="mt-2 text-sm text-red-600">{uploadError}</p>
              )}
            </div>
          )}

          {/* Upload: show existing file info when editing */}
          {sourceTab === "UPLOAD" && isEditing && uploadedFile && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-3">
                {isImageMime(uploadedFile.mimeType) ? (
                  <img
                    src={uploadedFile.fileUrl}
                    alt="Preview"
                    className="h-14 w-14 object-cover rounded-lg border border-gray-200"
                  />
                ) : (
                  <div className="h-14 w-14 flex items-center justify-center bg-white rounded-lg border border-gray-200">
                    <DocumentIcon className="h-7 w-7 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadedFile.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatBytes(uploadedFile.fileSizeBytes)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* URL fields */}
          {sourceTab === "URL" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://example.com/asset"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple/40 focus:border-brand-purple text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thumbnail URL{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://example.com/thumbnail.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple/40 focus:border-brand-purple text-sm"
                />
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Asset Title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple/40 focus:border-brand-purple text-sm"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={categoryVal}
              onChange={(e) => setCategoryVal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple/40 focus:border-brand-purple text-sm bg-white"
            >
              {categoryOptions.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe this asset..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple/40 focus:border-brand-purple text-sm resize-none"
            />
          </div>

          {/* Share toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-brand-navy transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <ShareIcon className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Share with network
              </span>
            </div>
          </label>
          <p className="text-xs text-gray-400 -mt-3 ml-[52px]">
            Other franchisees will see this in the Brand Library
          </p>

          {/* Error */}
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {formError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? "Saving..."
              : isEditing
              ? "Save Changes"
              : "Add Asset"}
          </button>
        </div>
      </div>
    </div>
  );
}
