"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  ArrowUpTrayIcon,
  PaperAirplaneIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  EyeIcon,
  XMarkIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

interface DocumentVersion {
  id: string;
  version: number;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  createdAt: string;
  uploadedByEmail: string | null;
}

interface FranchiseeDistribution {
  id: string;
  franchiseeAccountId: string;
  franchiseeName: string;
  status: string;
  acknowledgedAt: string | null;
  createdAt: string;
}

interface DocumentDetail {
  id: string;
  title: string;
  description: string | null;
  docType: string;
  category: string;
  version: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isPublic: boolean;
  franchiseeOnly: boolean;
  expiresAt: string | null;
  uploadedByEmail: string | null;
  createdAt: string;
  updatedAt: string;
  versions: DocumentVersion[];
  franchiseeDocuments: FranchiseeDistribution[];
}

interface FranchiseeOption {
  id: string;
  name: string;
  email: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

function getDocTypeBadgeStyles(docType: string): string {
  const styles: Record<string, string> = {
    FDD: "bg-red-100 text-red-700",
    FRANCHISE_AGREEMENT: "bg-blue-100 text-blue-700",
    TERRITORY_AGREEMENT: "bg-indigo-100 text-indigo-700",
    OPERATIONS_MANUAL: "bg-purple-100 text-purple-700",
    TRAINING_MATERIAL: "bg-green-100 text-green-700",
    MARKETING_ASSET: "bg-yellow-100 text-yellow-800",
    COMPLIANCE_CERT: "bg-orange-100 text-orange-700",
    INSURANCE_CERT: "bg-teal-100 text-teal-700",
    LEGAL_NOTICE: "bg-rose-100 text-rose-700",
    TEMPLATE: "bg-gray-100 text-gray-700",
    OTHER: "bg-slate-100 text-slate-600",
  };
  return styles[docType] || "bg-gray-100 text-gray-600";
}

function getCategoryBadgeStyles(category: string): string {
  const styles: Record<string, string> = {
    LEGAL: "bg-rose-50 text-rose-600 border border-rose-200",
    OPERATIONS: "bg-purple-50 text-purple-600 border border-purple-200",
    MARKETING: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    TRAINING: "bg-green-50 text-green-600 border border-green-200",
    COMPLIANCE: "bg-orange-50 text-orange-600 border border-orange-200",
    FINANCIAL: "bg-blue-50 text-blue-600 border border-blue-200",
  };
  return styles[category] || "bg-gray-50 text-gray-600 border border-gray-200";
}

function formatDocType(docType: string): string {
  const labels: Record<string, string> = {
    FDD: "FDD",
    FRANCHISE_AGREEMENT: "Franchise Agreement",
    TERRITORY_AGREEMENT: "Territory Agreement",
    OPERATIONS_MANUAL: "Operations Manual",
    TRAINING_MATERIAL: "Training Material",
    MARKETING_ASSET: "Marketing Asset",
    COMPLIANCE_CERT: "Compliance Cert",
    INSURANCE_CERT: "Insurance Cert",
    LEGAL_NOTICE: "Legal Notice",
    TEMPLATE: "Template",
    OTHER: "Other",
  };
  return labels[docType] || docType;
}

function formatCategory(category: string): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

function getStatusBadge(status: string): { label: string; styles: string } {
  const map: Record<string, { label: string; styles: string }> = {
    PENDING: { label: "Pending", styles: "bg-gray-100 text-gray-600" },
    VIEWED: { label: "Viewed", styles: "bg-blue-100 text-blue-700" },
    ACKNOWLEDGED: {
      label: "Acknowledged",
      styles: "bg-green-100 text-green-700",
    },
    SIGNATURE_PENDING: {
      label: "Signature Pending",
      styles: "bg-amber-100 text-amber-700",
    },
    SIGNED: { label: "Signed", styles: "bg-green-100 text-green-700" },
    EXPIRED: { label: "Expired", styles: "bg-red-100 text-red-700" },
  };
  return map[status] || { label: status, styles: "bg-gray-100 text-gray-600" };
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Send to franchisee modal state
  const [showSendModal, setShowSendModal] = useState(false);
  const [franchiseeOptions, setFranchiseeOptions] = useState<
    FranchiseeOption[]
  >([]);
  const [selectedFranchisees, setSelectedFranchisees] = useState<Set<string>>(
    new Set()
  );
  const [requireSignature, setRequireSignature] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  const fetchDocument = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/documents/${documentId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Document not found.");
          return;
        }
        throw new Error("Failed to fetch document");
      }
      const data = await response.json();
      setDocument(data.document);
    } catch (err) {
      console.error("Failed to fetch document:", err);
      setError("Failed to load document details.");
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const openSendModal = async () => {
    setShowSendModal(true);
    setSendError(null);
    setSendSuccess(false);
    setSelectedFranchisees(new Set());
    setRequireSignature(false);

    try {
      const response = await fetch("/api/admin/franchisees?status=SELECTED");
      const data = await response.json();
      const options = (data.franchisees || []).map(
        (f: {
          accountId?: string;
          id: string;
          firstName: string;
          lastName: string;
          email: string;
        }) => ({
          id: f.accountId || f.id,
          name: `${f.firstName} ${f.lastName}`,
          email: f.email,
        })
      );
      setFranchiseeOptions(options);
    } catch (err) {
      console.error("Failed to load franchisees:", err);
      setSendError("Failed to load franchisees list.");
    }
  };

  const toggleFranchisee = (id: string) => {
    setSelectedFranchisees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedFranchisees.size === franchiseeOptions.length) {
      setSelectedFranchisees(new Set());
    } else {
      setSelectedFranchisees(new Set(franchiseeOptions.map((f) => f.id)));
    }
  };

  const handleSend = async () => {
    if (selectedFranchisees.size === 0) {
      setSendError("Please select at least one franchisee.");
      return;
    }

    setIsSending(true);
    setSendError(null);

    try {
      const response = await fetch(
        `/api/admin/documents/${documentId}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            franchiseeAccountIds: Array.from(selectedFranchisees),
            requireSignature,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send document");
      }

      setSendSuccess(true);
      // Refresh document data to show new distributions
      fetchDocument();

      // Close modal after a short delay
      setTimeout(() => {
        setShowSendModal(false);
        setSendSuccess(false);
      }, 2000);
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : "Failed to send document"
      );
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="max-w-7xl mx-auto">
        <Link
          href="/admin/documents"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-navy mb-6"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Documents
        </Link>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ExclamationCircleIcon className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">
            {error || "Document not found"}
          </p>
          <Link
            href="/admin/documents"
            className="inline-flex items-center gap-1 mt-4 text-sm text-brand-navy hover:underline"
          >
            Return to Document Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back Link */}
      <Link
        href="/admin/documents"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-navy mb-4 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Documents
      </Link>

      {/* Title and Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDocTypeBadgeStyles(document.docType)}`}
          >
            {formatDocType(document.docType)}
          </span>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${getCategoryBadgeStyles(document.category)}`}
          >
            {formatCategory(document.category)}
          </span>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left: Document Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Document Details
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Title</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {document.title}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Document Type
                </dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {formatDocType(document.docType)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {formatCategory(document.category)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Version</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  v{document.version}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  File Name
                </dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {document.fileName}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  File Size
                </dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {formatFileSize(document.fileSize)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  MIME Type
                </dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {document.mimeType}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Upload Date
                </dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {formatDateTime(document.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Uploaded By
                </dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {document.uploadedByEmail || "System"}
                </dd>
              </div>
              {document.expiresAt && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Expiration Date
                  </dt>
                  <dd className="text-sm text-gray-900 mt-1">
                    {formatDate(document.expiresAt)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Visibility
                </dt>
                <dd className="text-sm text-gray-900 mt-1 flex items-center gap-2">
                  {document.isPublic && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Public
                    </span>
                  )}
                  {document.franchiseeOnly && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      Franchisee Only
                    </span>
                  )}
                  {!document.isPublic && !document.franchiseeOnly && (
                    <span className="text-gray-500">Internal</span>
                  )}
                </dd>
              </div>
            </dl>

            {document.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <dt className="text-sm font-medium text-gray-500 mb-1">
                  Description
                </dt>
                <dd className="text-sm text-gray-700 whitespace-pre-wrap">
                  {document.description}
                </dd>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Actions
            </h2>
            <div className="space-y-3">
              <a
                href={document.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 transition-colors text-sm font-medium"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Download Current Version
              </a>

              <button
                onClick={() =>
                  router.push(`/admin/documents/${documentId}#edit`)
                }
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Edit Metadata
              </button>

              <button
                onClick={() =>
                  router.push(`/admin/documents/upload?parentId=${documentId}`)
                }
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <ArrowUpTrayIcon className="h-4 w-4" />
                Upload New Version
              </button>

              <button
                onClick={openSendModal}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-purple text-white rounded-lg hover:bg-brand-purple/90 transition-colors text-sm font-medium"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
                Send to Franchisee
              </button>
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Quick Info
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Distributed to</span>
                <span className="font-medium text-gray-900">
                  {document.franchiseeDocuments.length} franchisee
                  {document.franchiseeDocuments.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Versions</span>
                <span className="font-medium text-gray-900">
                  {document.versions.length + 1}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Updated</span>
                <span className="font-medium text-gray-900">
                  {formatDate(document.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Version History */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-gray-400" />
            Version History
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {/* Current version */}
          <div className="px-6 py-4 flex items-center justify-between bg-brand-navy/[0.02]">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-brand-navy/10 flex items-center justify-center text-xs font-bold text-brand-navy">
                v{document.version}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {document.fileName}
                  <span className="ml-2 text-xs text-brand-navy font-medium">
                    Current
                  </span>
                </p>
                <p className="text-xs text-gray-500">
                  {formatDateTime(document.createdAt)} &middot;{" "}
                  {formatFileSize(document.fileSize)} &middot;{" "}
                  {document.uploadedByEmail || "System"}
                </p>
              </div>
            </div>
            <a
              href={document.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-brand-navy hover:bg-brand-navy/5 rounded transition-colors font-medium"
            >
              <ArrowDownTrayIcon className="h-3.5 w-3.5" />
              Download
            </a>
          </div>

          {/* Previous versions */}
          {document.versions.map((ver) => (
            <div
              key={ver.id}
              className="px-6 py-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                  v{ver.version}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {ver.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(ver.createdAt)} &middot;{" "}
                    {formatFileSize(ver.fileSize)} &middot;{" "}
                    {ver.uploadedByEmail || "System"}
                  </p>
                </div>
              </div>
              <a
                href={ver.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors font-medium"
              >
                <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                Download
              </a>
            </div>
          ))}

          {document.versions.length === 0 && (
            <div className="px-6 py-4 text-center text-sm text-gray-400">
              No previous versions
            </div>
          )}
        </div>
      </div>

      {/* Franchisee Distribution */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-gray-400" />
            Franchisee Distribution
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Franchisee
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Sent
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Acknowledged
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {document.franchiseeDocuments.map((fd) => {
                const badge = getStatusBadge(fd.status);
                return (
                  <tr key={fd.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {fd.franchiseeName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.styles}`}
                      >
                        {fd.status === "ACKNOWLEDGED" || fd.status === "SIGNED" ? (
                          <CheckCircleIcon className="h-3 w-3" />
                        ) : fd.status === "VIEWED" ? (
                          <EyeIcon className="h-3 w-3" />
                        ) : (
                          <ClockIcon className="h-3 w-3" />
                        )}
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {formatDate(fd.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {fd.acknowledgedAt
                          ? formatDateTime(fd.acknowledgedAt)
                          : "---"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {document.franchiseeDocuments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center">
                    <p className="text-sm text-gray-400">
                      This document has not been sent to any franchisees yet.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send to Franchisee Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setShowSendModal(false)}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 z-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Send Document to Franchisees
                </h3>
                <button
                  onClick={() => setShowSendModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Select franchisees to receive &ldquo;{document.title}&rdquo;
              </p>

              {/* Success State */}
              {sendSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm mb-4">
                  <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
                  Document sent successfully!
                </div>
              )}

              {/* Error State */}
              {sendError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
                  <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
                  {sendError}
                </div>
              )}

              {/* Select All */}
              {franchiseeOptions.length > 0 && (
                <div className="mb-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        selectedFranchisees.size === franchiseeOptions.length &&
                        franchiseeOptions.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="h-4 w-4 text-brand-navy border-gray-300 rounded focus:ring-brand-navy"
                    />
                    Select All ({franchiseeOptions.length})
                  </label>
                </div>
              )}

              {/* Franchisee List */}
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 mb-4">
                {franchiseeOptions.length === 0 && (
                  <div className="p-4 text-center text-sm text-gray-400">
                    No active franchisees found
                  </div>
                )}
                {franchiseeOptions.map((f) => (
                  <label
                    key={f.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFranchisees.has(f.id)}
                      onChange={() => toggleFranchisee(f.id)}
                      className="h-4 w-4 text-brand-navy border-gray-300 rounded focus:ring-brand-navy"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {f.name}
                      </p>
                      <p className="text-xs text-gray-500">{f.email}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Require Signature Toggle */}
              <label className="flex items-center gap-2 mb-6 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireSignature}
                  onChange={(e) => setRequireSignature(e.target.checked)}
                  className="h-4 w-4 text-brand-navy border-gray-300 rounded focus:ring-brand-navy"
                />
                Require signature acknowledgment
              </label>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowSendModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={
                    isSending ||
                    selectedFranchisees.size === 0 ||
                    sendSuccess
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-purple rounded-lg hover:bg-brand-purple/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="h-4 w-4" />
                      Send to {selectedFranchisees.size} Franchisee
                      {selectedFranchisees.size !== 1 ? "s" : ""}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
