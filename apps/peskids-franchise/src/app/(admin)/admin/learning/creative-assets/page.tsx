"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { Card, CardContent } from "@/components/shared/Card";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { CanvaConnectionStatus } from "@/components/admin/CanvaConnectionStatus";
import { CanvaDesignPicker } from "@/components/admin/CanvaDesignPicker";
import { formatDate } from "@/lib/utils";
import {
  PaintBrushIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
  LinkIcon,
  DocumentIcon,
  FilmIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SwatchIcon,
  GlobeAltIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";

// ─── Types ────────────────────────────────────────────────────────────────────

type AssetCategory =
  | "LOGOS"
  | "SOCIAL_MEDIA"
  | "FLYERS_PRINT"
  | "EMAIL_TEMPLATES"
  | "PRESENTATIONS"
  | "LEGAL_DOCS"
  | "PHOTOS_MEDIA"
  | "OTHER";

type AssetSourceType = "CANVA" | "UPLOAD" | "URL";

interface CreativeAsset {
  id: string;
  title: string;
  description: string | null;
  category: AssetCategory;
  sourceType: AssetSourceType;
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
  createdAt: string;
  updatedAt: string;
}

interface CanvaDesignSelection {
  id: string;
  title: string;
  thumbnail?: { url: string; width: number; height: number };
  embedUrl: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

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
  LOGOS: "bg-blue-100 text-blue-800",
  SOCIAL_MEDIA: "bg-purple-100 text-purple-800",
  FLYERS_PRINT: "bg-green-100 text-green-800",
  EMAIL_TEMPLATES: "bg-cyan-100 text-cyan-800",
  PRESENTATIONS: "bg-orange-100 text-orange-800",
  LEGAL_DOCS: "bg-red-100 text-red-800",
  PHOTOS_MEDIA: "bg-yellow-100 text-yellow-800",
  OTHER: "bg-gray-100 text-gray-800",
};

const sourceColors: Record<AssetSourceType, string> = {
  CANVA: "bg-purple-100 text-purple-700",
  UPLOAD: "bg-blue-100 text-blue-700",
  URL: "bg-amber-100 text-amber-700",
};

const sourceLabels: Record<AssetSourceType, string> = {
  CANVA: "Canva",
  UPLOAD: "Upload",
  URL: "URL",
};

const CATEGORIES: AssetCategory[] = [
  "LOGOS",
  "SOCIAL_MEDIA",
  "FLYERS_PRINT",
  "EMAIL_TEMPLATES",
  "PRESENTATIONS",
  "LEGAL_DOCS",
  "PHOTOS_MEDIA",
  "OTHER",
];

type ModalTab = "canva" | "upload" | "url";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getThumbnailForAsset(asset: CreativeAsset): string | null {
  if (asset.sourceType === "CANVA" && asset.canvaThumbnailUrl) {
    return asset.canvaThumbnailUrl;
  }
  if (asset.sourceType === "UPLOAD" && asset.fileUrl && asset.mimeType?.startsWith("image/")) {
    return asset.fileUrl;
  }
  if (asset.thumbnailUrl) {
    return asset.thumbnailUrl;
  }
  return null;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <DocumentIcon className="w-10 h-10 text-gray-300" />;
  if (mimeType.startsWith("video/")) return <FilmIcon className="w-10 h-10 text-gray-300" />;
  if (mimeType === "application/pdf") return <DocumentTextIcon className="w-10 h-10 text-red-300" />;
  if (mimeType.startsWith("image/")) return <PhotoIcon className="w-10 h-10 text-gray-300" />;
  return <DocumentIcon className="w-10 h-10 text-gray-300" />;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminCreativeAssetsPage() {
  // ─── Data state ─────────────────────────────────────────────────────────
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // ─── Modal state ────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<CreativeAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CreativeAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ─── Add modal tab state ───────────────────────────────────────────────
  const [modalTab, setModalTab] = useState<ModalTab>("canva");

  // ─── Canva picker state ────────────────────────────────────────────────
  const [showCanvaPicker, setShowCanvaPicker] = useState(false);
  const [selectedCanvaDesign, setSelectedCanvaDesign] = useState<CanvaDesignSelection | null>(null);

  // ─── Upload state ──────────────────────────────────────────────────────
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [uploadedFileData, setUploadedFileData] = useState<{
    fileUrl: string;
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // ─── Form state (shared by all tabs) ──────────────────────────────────
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState<AssetCategory>("OTHER");
  const [formIsOfficial, setFormIsOfficial] = useState(false);
  const [formIsPublic, setFormIsPublic] = useState(false);
  const [formExternalUrl, setFormExternalUrl] = useState("");
  const [formThumbnailUrl, setFormThumbnailUrl] = useState("");

  // ─── Canva section collapse state ─────────────────────────────────────
  const [canvaSectionOpen, setCanvaSectionOpen] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCategory) params.set("category", activeCategory);
      const res = await fetch(`/api/admin/creative-assets?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch assets");
      const data = await res.json();
      setAssets(data.assets || []);
    } catch (error) {
      console.error("Failed to fetch creative assets:", error);
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // ─── Filtered assets ───────────────────────────────────────────────────

  const filteredAssets = searchQuery
    ? assets.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : assets;

  // ─── Summary counts ───────────────────────────────────────────────────

  const totalCount = assets.length;
  const canvaCount = assets.filter((a) => a.sourceType === "CANVA").length;
  const uploadCount = assets.filter((a) => a.sourceType === "UPLOAD").length;
  const urlCount = assets.filter((a) => a.sourceType === "URL").length;

  // ─── Form helpers ─────────────────────────────────────────────────────

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormCategory("OTHER");
    setFormIsOfficial(false);
    setFormIsPublic(false);
    setFormExternalUrl("");
    setFormThumbnailUrl("");
    setSelectedCanvaDesign(null);
    setUploadFile(null);
    setUploadProgress("idle");
    setUploadedFileData(null);
    setDragActive(false);
    setErrorMessage("");
    setModalTab("canva");
  };

  const openAdd = () => {
    resetForm();
    setEditingAsset(null);
    setShowAddModal(true);
  };

  const openEdit = (asset: CreativeAsset) => {
    setFormTitle(asset.title);
    setFormDescription(asset.description || "");
    setFormCategory(asset.category);
    setFormIsOfficial(asset.isOfficial);
    setFormIsPublic(asset.isPublic);
    setFormExternalUrl(asset.externalUrl || "");
    setFormThumbnailUrl(asset.thumbnailUrl || "");
    setSelectedCanvaDesign(null);
    setUploadFile(null);
    setUploadProgress("idle");
    setUploadedFileData(null);
    setErrorMessage("");
    setEditingAsset(asset);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingAsset(null);
    resetForm();
  };

  // ─── Canva design selection ───────────────────────────────────────────

  const handleCanvaSelect = (design: CanvaDesignSelection) => {
    setSelectedCanvaDesign(design);
    setFormTitle(design.title || "Untitled Canva Design");
    setShowCanvaPicker(false);
  };

  // ─── File upload handling ─────────────────────────────────────────────

  const handleFileSelect = (file: File) => {
    setUploadFile(file);
    setUploadProgress("idle");
    setUploadedFileData(null);
    if (!formTitle) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setFormTitle(nameWithoutExt);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const uploadFileToServer = async (): Promise<boolean> => {
    if (!uploadFile) return false;
    setUploadProgress("uploading");
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      const res = await fetch("/api/admin/creative-assets/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      setUploadedFileData({
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSizeBytes: data.fileSizeBytes,
        mimeType: data.mimeType,
      });
      setUploadProgress("done");
      return true;
    } catch (error: any) {
      setErrorMessage(error.message || "Upload failed");
      setUploadProgress("error");
      return false;
    }
  };

  // ─── Save (Create / Update) ───────────────────────────────────────────

  const handleSave = async () => {
    if (!formTitle.trim()) {
      setErrorMessage("Title is required.");
      return;
    }

    // For new assets, validate based on tab
    if (!editingAsset) {
      if (modalTab === "canva" && !selectedCanvaDesign) {
        setErrorMessage("Please select a Canva design.");
        return;
      }
      if (modalTab === "upload" && !uploadFile && !uploadedFileData) {
        setErrorMessage("Please select a file to upload.");
        return;
      }
      if (modalTab === "url" && !formExternalUrl.trim()) {
        setErrorMessage("Please enter a URL.");
        return;
      }
    }

    setSaving(true);
    setErrorMessage("");

    try {
      // If uploading a file and haven't uploaded yet, upload first
      if (!editingAsset && modalTab === "upload" && uploadFile && !uploadedFileData) {
        const uploaded = await uploadFileToServer();
        if (!uploaded) {
          setSaving(false);
          return;
        }
      }

      if (editingAsset) {
        // ─── Update existing asset ─────────────────────────────────
        const body: Record<string, unknown> = {
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          category: formCategory,
          isOfficial: formIsOfficial,
          isPublic: formIsPublic,
        };

        if (editingAsset.sourceType === "URL") {
          body.externalUrl = formExternalUrl.trim() || null;
          body.thumbnailUrl = formThumbnailUrl.trim() || null;
        }

        const res = await fetch(`/api/admin/creative-assets/${editingAsset.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update asset");
        }
      } else {
        // ─── Create new asset ──────────────────────────────────────
        let body: Record<string, unknown> = {
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          category: formCategory,
          isOfficial: formIsOfficial,
          isPublic: formIsPublic,
        };

        if (modalTab === "canva" && selectedCanvaDesign) {
          body.sourceType = "CANVA";
          body.canvaDesignId = selectedCanvaDesign.id;
          body.canvaEmbedUrl = selectedCanvaDesign.embedUrl;
          body.canvaThumbnailUrl = selectedCanvaDesign.thumbnail?.url || null;
        } else if (modalTab === "upload" && uploadedFileData) {
          body.sourceType = "UPLOAD";
          body.fileUrl = uploadedFileData.fileUrl;
          body.fileName = uploadedFileData.fileName;
          body.fileSizeBytes = uploadedFileData.fileSizeBytes;
          body.mimeType = uploadedFileData.mimeType;
        } else if (modalTab === "url") {
          body.sourceType = "URL";
          body.externalUrl = formExternalUrl.trim();
          body.thumbnailUrl = formThumbnailUrl.trim() || null;
        }

        const res = await fetch("/api/admin/creative-assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create asset");
        }
      }

      closeModal();
      fetchAssets();
    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/creative-assets/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete asset");
      setDeleteTarget(null);
      fetchAssets();
    } catch (error) {
      console.error("Failed to delete asset:", error);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <WideContainer className="py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <PaintBrushIcon className="h-7 w-7 text-brand-navy" />
            Creative Assets
          </h1>
          <p className="text-gray-500 mt-1">
            Manage brand assets from Canva, file uploads, and external links
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-navy text-white font-medium rounded-xl hover:bg-brand-navy/90 transition-colors shadow-sm"
        >
          <PlusIcon className="h-5 w-5" />
          Add Asset
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500 p-5">
          <div className="flex items-center gap-2 mb-2">
            <SwatchIcon className="h-5 w-5 text-emerald-600" />
            <span className="text-sm text-gray-500">Total Assets</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{totalCount}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-purple-500 p-5">
          <div className="flex items-center gap-2 mb-2">
            <PaintBrushIcon className="h-5 w-5 text-purple-600" />
            <span className="text-sm text-gray-500">Canva Designs</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">{canvaCount}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CloudArrowUpIcon className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-gray-500">Uploads</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{uploadCount}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-amber-500 p-5">
          <div className="flex items-center gap-2 mb-2">
            <LinkIcon className="h-5 w-5 text-amber-600" />
            <span className="text-sm text-gray-500">External Links</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{urlCount}</p>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="mb-6">
        <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-gray-200">
          {Object.entries(categoryLabels).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setActiveCategory(value)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[2px] ${
                activeCategory === value
                  ? "border-brand-navy text-brand-navy font-semibold"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets by title or description..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy"
          />
        </div>
      </div>

      {/* Asset Grid */}
      {loading ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-brand-navy mb-3" />
              <p className="text-sm">Loading creative assets...</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-gray-400">
              <PaintBrushIcon className="h-12 w-12 mb-3" />
              <p className="text-lg font-medium text-gray-500">No assets found</p>
              <p className="text-sm mt-1">
                {activeCategory || searchQuery
                  ? "Try adjusting your filters or search"
                  : "Add your first creative asset to get started"}
              </p>
              {!activeCategory && !searchQuery && (
                <button
                  onClick={openAdd}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-navy text-white text-sm font-medium rounded-lg hover:bg-brand-navy/90 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Asset
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => {
            const thumb = getThumbnailForAsset(asset);

            return (
              <div
                key={asset.id}
                className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all"
              >
                {/* Thumbnail Area */}
                <div className="relative aspect-[4/3] bg-gray-50">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={asset.title}
                      className="w-full h-full object-cover"
                    />
                  ) : asset.sourceType === "UPLOAD" ? (
                    <div className="w-full h-full flex items-center justify-center">
                      {getFileIcon(asset.mimeType)}
                    </div>
                  ) : asset.sourceType === "URL" ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <GlobeAltIcon className="w-10 h-10 text-gray-300" />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PhotoIcon className="w-10 h-10 text-gray-300" />
                    </div>
                  )}

                  {/* Source badge - top right */}
                  <span
                    className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sourceColors[asset.sourceType]}`}
                  >
                    {sourceLabels[asset.sourceType]}
                  </span>

                  {/* Official badge - top left */}
                  {asset.isOfficial && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                      <ShieldCheckIcon className="w-3 h-3" />
                      Official
                    </span>
                  )}

                  {/* Hover overlay with actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => openEdit(asset)}
                      className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
                      title="Edit"
                    >
                      <PencilSquareIcon className="h-4 w-4 text-gray-700" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(asset)}
                      className="p-2 bg-white rounded-lg shadow-md hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-2">
                    {asset.title}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        categoryColors[asset.category] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {categoryLabels[asset.category] || asset.category}
                    </span>
                    {asset.sourceType === "UPLOAD" && asset.fileSizeBytes && (
                      <span className="text-[10px] text-gray-400">
                        {formatFileSize(asset.fileSizeBytes)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{formatDate(asset.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Canva Integration Section (collapsible) ─────────────────────── */}
      <div className="mt-10">
        <button
          onClick={() => setCanvaSectionOpen(!canvaSectionOpen)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
        >
          {canvaSectionOpen ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )}
          Canva Integration
        </button>
        {canvaSectionOpen && (
          <div className="mt-3">
            <CanvaConnectionStatus />
          </div>
        )}
      </div>

      {/* ─── Add / Edit Modal ────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingAsset ? "Edit Asset" : "Add Asset"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Source Tabs (only for create) */}
            {!editingAsset && (
              <div className="flex border-b border-gray-200 px-6">
                <button
                  onClick={() => setModalTab("canva")}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-[1px] transition-colors ${
                    modalTab === "canva"
                      ? "border-purple-600 text-purple-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <PaintBrushIcon className="h-4 w-4" />
                  Canva
                </button>
                <button
                  onClick={() => setModalTab("upload")}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-[1px] transition-colors ${
                    modalTab === "upload"
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  Upload
                </button>
                <button
                  onClick={() => setModalTab("url")}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-[1px] transition-colors ${
                    modalTab === "url"
                      ? "border-amber-600 text-amber-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <LinkIcon className="h-4 w-4" />
                  URL
                </button>
              </div>
            )}

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">
              {errorMessage && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {errorMessage}
                </div>
              )}

              {/* Edit mode: show source info */}
              {editingAsset && (
                <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600">
                  <span className="font-medium">Source:</span>{" "}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sourceColors[editingAsset.sourceType]}`}>
                    {sourceLabels[editingAsset.sourceType]}
                  </span>
                  {editingAsset.sourceType === "CANVA" && editingAsset.canvaDesignId && (
                    <span className="ml-2 text-gray-400">ID: {editingAsset.canvaDesignId}</span>
                  )}
                  {editingAsset.sourceType === "UPLOAD" && editingAsset.fileName && (
                    <span className="ml-2 text-gray-400">{editingAsset.fileName}</span>
                  )}
                </div>
              )}

              {/* ─── Canva Tab Content ──────────────────────────────────── */}
              {!editingAsset && modalTab === "canva" && (
                <div>
                  <CanvaConnectionStatus showDisconnect={false} />
                  <div className="mt-4">
                    {selectedCanvaDesign ? (
                      <div className="flex items-start gap-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                        {selectedCanvaDesign.thumbnail?.url ? (
                          <img
                            src={selectedCanvaDesign.thumbnail.url}
                            alt={selectedCanvaDesign.title}
                            className="w-20 h-15 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-20 h-15 bg-purple-100 rounded-lg flex items-center justify-center">
                            <PhotoIcon className="w-6 h-6 text-purple-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-purple-900 truncate">
                            {selectedCanvaDesign.title}
                          </p>
                          <p className="text-xs text-purple-600 mt-1">Design selected</p>
                        </div>
                        <button
                          onClick={() => setShowCanvaPicker(true)}
                          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowCanvaPicker(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 hover:bg-purple-50 hover:border-purple-400 transition-colors"
                      >
                        <PaintBrushIcon className="h-5 w-5" />
                        Select from Canva
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ─── Upload Tab Content ─────────────────────────────────── */}
              {!editingAsset && modalTab === "upload" && (
                <div>
                  {uploadedFileData ? (
                    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <CloudArrowUpIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-blue-900 truncate">{uploadedFileData.fileName}</p>
                        <p className="text-xs text-blue-600">
                          {formatFileSize(uploadedFileData.fileSizeBytes)} - Uploaded successfully
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-colors cursor-pointer ${
                        dragActive
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="file"
                        onChange={handleFileInputChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      {uploadProgress === "uploading" ? (
                        <>
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-500 mb-3" />
                          <p className="text-sm text-blue-600 font-medium">Uploading...</p>
                        </>
                      ) : uploadFile ? (
                        <>
                          <DocumentIcon className="h-8 w-8 text-blue-500 mb-2" />
                          <p className="text-sm font-medium text-gray-900">{uploadFile.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatFileSize(uploadFile.size)} - Click or drag to replace
                          </p>
                        </>
                      ) : (
                        <>
                          <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm font-medium text-gray-700">
                            Drop a file here or click to browse
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Images, PDFs, videos, or any file type
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── URL Tab Content ────────────────────────────────────── */}
              {(!editingAsset && modalTab === "url" || editingAsset?.sourceType === "URL") && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={formExternalUrl}
                      onChange={(e) => setFormExternalUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Thumbnail URL{" "}
                      <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="url"
                      value={formThumbnailUrl}
                      onChange={(e) => setFormThumbnailUrl(e.target.value)}
                      placeholder="https://... (image URL for preview)"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                    />
                  </div>
                </>
              )}

              {/* ─── Shared Form Fields ─────────────────────────────────── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Asset title..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of this asset..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as AssetCategory)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryLabels[cat]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggles Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formIsOfficial}
                        onChange={(e) => setFormIsOfficial(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-green-500 transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        Official Asset
                      </span>
                      <p className="text-xs text-gray-400">Mark as an official brand asset</p>
                    </div>
                  </label>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formIsPublic}
                        onChange={(e) => setFormIsPublic(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-500 transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        Public
                      </span>
                      <p className="text-xs text-gray-400">Visible to franchisees</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-brand-navy hover:bg-brand-navy/90 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    Saving...
                  </>
                ) : editingAsset ? (
                  "Save Changes"
                ) : (
                  "Save Asset"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Canva Design Picker ─────────────────────────────────────────── */}
      <CanvaDesignPicker
        isOpen={showCanvaPicker}
        onClose={() => setShowCanvaPicker(false)}
        onSelect={handleCanvaSelect}
        selectedId={selectedCanvaDesign?.id}
      />

      {/* ─── Delete Confirmation Modal ───────────────────────────────────── */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Delete Asset"
        message={`Are you sure you want to delete "${deleteTarget?.title || ""}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </WideContainer>
  );
}
