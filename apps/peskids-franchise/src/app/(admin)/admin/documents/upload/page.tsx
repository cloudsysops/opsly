"use client";

export const dynamic = "force-dynamic";

import React, { useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

const DOC_TYPE_OPTIONS = [
  { value: "", label: "Select document type..." },
  { value: "FDD", label: "FDD (Franchise Disclosure Document)" },
  { value: "FRANCHISE_AGREEMENT", label: "Franchise Agreement" },
  { value: "TERRITORY_AGREEMENT", label: "Territory Agreement" },
  { value: "OPERATIONS_MANUAL", label: "Operations Manual" },
  { value: "TRAINING_MATERIAL", label: "Training Material" },
  { value: "MARKETING_ASSET", label: "Marketing Asset" },
  { value: "COMPLIANCE_CERT", label: "Compliance Certificate" },
  { value: "INSURANCE_CERT", label: "Insurance Certificate" },
  { value: "LEGAL_NOTICE", label: "Legal Notice" },
  { value: "TEMPLATE", label: "Template" },
  { value: "OTHER", label: "Other" },
];

const DOC_CATEGORY_OPTIONS = [
  { value: "", label: "Select category..." },
  { value: "LEGAL", label: "Legal" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "MARKETING", label: "Marketing" },
  { value: "TRAINING", label: "Training" },
  { value: "COMPLIANCE", label: "Compliance" },
  { value: "FINANCIAL", label: "Financial" },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export default function UploadDocumentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parentId = searchParams.get("parentId");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [docType, setDocType] = useState("");
  const [category, setCategory] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [franchiseeOnly, setFranchiseeOnly] = useState(false);

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState<
    "idle" | "uploading-file" | "saving-metadata" | "complete" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    // Auto-fill title from filename if empty
    if (!title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExt.replace(/[-_]/g, " "));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!docType) {
      setError("Document type is required.");
      return;
    }
    if (!category) {
      setError("Category is required.");
      return;
    }
    if (!selectedFile) {
      setError("Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    setUploadStep("uploading-file");
    setUploadProgress(10);

    try {
      // Step 1: Upload file
      const formData = new FormData();
      formData.append("file", selectedFile);

      setUploadProgress(30);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json().catch(() => ({}));
        throw new Error(
          uploadError.error || "Failed to upload file. Please try again."
        );
      }

      const uploadData = await uploadResponse.json();
      setUploadProgress(60);

      // Step 2: Create document record with metadata
      setUploadStep("saving-metadata");

      const documentPayload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        docType,
        category,
        fileUrl: uploadData.url,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type || "application/octet-stream",
        isPublic,
        franchiseeOnly,
        expiresAt: expiresAt || null,
      };

      if (parentId) {
        documentPayload.parentId = parentId;
      }

      setUploadProgress(80);

      const docResponse = await fetch("/api/admin/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(documentPayload),
      });

      if (!docResponse.ok) {
        const docError = await docResponse.json().catch(() => ({}));
        throw new Error(
          docError.error ||
            "Failed to save document metadata. The file was uploaded but the record was not created."
        );
      }

      const docData = await docResponse.json();
      setUploadProgress(100);
      setUploadStep("complete");

      // Redirect to new document's detail page
      setTimeout(() => {
        router.push(`/admin/documents/${docData.document.id}`);
      }, 1000);
    } catch (err) {
      setUploadStep("error");
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back Link */}
      <Link
        href="/admin/documents"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-navy mb-4 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Documents
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {parentId ? "Upload New Version" : "Upload Document"}
        </h1>
        <p className="text-gray-500 mt-1">
          {parentId
            ? "Upload a new version of this document."
            : "Add a new document to the library."}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-6">
          <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            {uploadStep === "complete" ? (
              <CheckCircleIcon className="h-6 w-6 text-green-500" />
            ) : (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-navy"></div>
            )}
            <span className="text-sm font-medium text-gray-900">
              {uploadStep === "uploading-file" && "Uploading file..."}
              {uploadStep === "saving-metadata" && "Saving document metadata..."}
              {uploadStep === "complete" && "Upload complete! Redirecting..."}
              {uploadStep === "error" && "Upload failed"}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                uploadStep === "complete"
                  ? "bg-green-500"
                  : uploadStep === "error"
                    ? "bg-red-500"
                    : "bg-brand-navy"
              }`}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm"
              disabled={isUploading}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this document"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm resize-vertical"
              disabled={isUploading}
            />
          </div>

          {/* Type and Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="docType"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Document Type <span className="text-red-500">*</span>
              </label>
              <select
                id="docType"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm"
                disabled={isUploading}
              >
                {DOC_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm"
                disabled={isUploading}
              >
                {DOC_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File <span className="text-red-500">*</span>
            </label>

            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-brand-navy bg-brand-navy/5"
                    : "border-gray-300 hover:border-brand-navy/50 hover:bg-gray-50"
                }`}
              >
                <CloudArrowUpIcon
                  className={`h-10 w-10 mx-auto mb-3 ${
                    isDragging ? "text-brand-navy" : "text-gray-400"
                  }`}
                />
                <p className="text-sm font-medium text-gray-700">
                  {isDragging
                    ? "Drop your file here"
                    : "Drag and drop your file here, or click to browse"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, PNG, JPG, ZIP
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInputChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.zip,.rar,.txt,.csv"
                  disabled={isUploading}
                />
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-brand-navy/10 flex items-center justify-center flex-shrink-0">
                    <DocumentIcon className="h-5 w-5 text-brand-navy" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(selectedFile.size)} &middot;{" "}
                      {selectedFile.type || "Unknown type"}
                    </p>
                  </div>
                </div>
                {!isUploading && (
                  <button
                    type="button"
                    onClick={removeFile}
                    className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                    title="Remove file"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Optional Fields */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              Optional Settings
            </h3>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="expiresAt"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Expiration Date
                </label>
                <input
                  id="expiresAt"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm"
                  disabled={isUploading}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Leave blank if the document does not expire.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 text-brand-navy border-gray-300 rounded focus:ring-brand-navy"
                    disabled={isUploading}
                  />
                  Public document (visible on website)
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={franchiseeOnly}
                    onChange={(e) => setFranchiseeOnly(e.target.checked)}
                    className="h-4 w-4 text-brand-navy border-gray-300 rounded focus:ring-brand-navy"
                    disabled={isUploading}
                  />
                  Franchisee only
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Link
            href="/admin/documents"
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isUploading}
            className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-brand-navy rounded-lg hover:bg-brand-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Uploading...
              </>
            ) : (
              <>
                <CloudArrowUpIcon className="h-4 w-4" />
                Upload Document
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
