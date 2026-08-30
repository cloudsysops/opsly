"use client";

import { useState, useEffect } from "react";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { Card, CardHeader, CardContent } from "@/components/shared/Card";
import { formatDate } from "@/lib/utils";
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  PencilSquareIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

interface FranchiseeDoc {
  id: string;
  documentId: string;
  title: string;
  description: string | null;
  docType: string;
  category: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    bg: string;
    text: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  PENDING: {
    label: "Pending",
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    icon: ClockIcon,
  },
  VIEWED: {
    label: "Viewed",
    bg: "bg-blue-100",
    text: "text-blue-800",
    icon: EyeIcon,
  },
  ACKNOWLEDGED: {
    label: "Acknowledged",
    bg: "bg-green-100",
    text: "text-green-700",
    icon: CheckCircleIcon,
  },
  SIGNED: {
    label: "Signed",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    icon: PencilSquareIcon,
  },
  SIGNATURE_PENDING: {
    label: "Signature Pending",
    bg: "bg-orange-100",
    text: "text-orange-800",
    icon: ExclamationTriangleIcon,
  },
  EXPIRED: {
    label: "Expired",
    bg: "bg-red-100",
    text: "text-red-700",
    icon: ExclamationTriangleIcon,
  },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  FDD: "FDD",
  FRANCHISE_AGREEMENT: "Franchise Agreement",
  TERRITORY_AGREEMENT: "Territory Agreement",
  OPERATIONS_MANUAL: "Operations Manual",
  TRAINING_MATERIAL: "Training Material",
  MARKETING_ASSET: "Marketing Asset",
  COMPLIANCE_CERT: "Compliance Certificate",
  INSURANCE_CERT: "Insurance Certificate",
  LEGAL_NOTICE: "Legal Notice",
  TEMPLATE: "Template",
  OTHER: "Other",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FranchiseeDocumentsPage() {
  const [documents, setDocuments] = useState<FranchiseeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    try {
      const res = await fetch("/api/franchisee/documents");
      const json = await res.json();

      if (json.error) {
        setError(json.error);
        return;
      }

      setDocuments(json.documents || []);
    } catch (err) {
      console.error("Error fetching documents:", err);
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  function handleAcknowledgeClick(docId: string) {
    setSelectedDocId(docId);
    setShowConfirmModal(true);
  }

  async function confirmAcknowledge() {
    if (!selectedDocId) return;

    setAcknowledging(selectedDocId);
    setShowConfirmModal(false);

    try {
      const res = await fetch(
        `/api/franchisee/documents/${selectedDocId}/acknowledge`,
        {
          method: "POST",
        }
      );

      const json = await res.json();

      if (json.error) {
        setError(json.error);
        return;
      }

      // Update the document in the local state
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === selectedDocId
            ? {
                ...doc,
                status: "ACKNOWLEDGED",
                acknowledgedAt: new Date().toISOString(),
              }
            : doc
        )
      );
    } catch (err) {
      console.error("Error acknowledging document:", err);
      setError("Failed to acknowledge document");
    } finally {
      setAcknowledging(null);
      setSelectedDocId(null);
    }
  }

  const pendingCount = documents.filter(
    (d) => d.status === "PENDING" || d.status === "VIEWED"
  ).length;
  const signaturePendingCount = documents.filter(
    (d) => d.status === "SIGNATURE_PENDING"
  ).length;

  if (loading) {
    return (
      <WideContainer className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </WideContainer>
    );
  }

  return (
    <WideContainer className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">
          My Documents
        </h1>
        <p className="mt-1 text-gray-600">
          View and manage your franchise documents
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-500 text-xs mt-1 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Total Documents</p>
            <p className="text-2xl font-bold text-brand-navy">
              {documents.length}
            </p>
          </CardContent>
        </Card>
        <Card
          className={
            pendingCount > 0 ? "border-yellow-300 bg-yellow-50" : ""
          }
        >
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Pending Acknowledgment</p>
            <p
              className={`text-2xl font-bold ${
                pendingCount > 0 ? "text-yellow-600" : "text-gray-600"
              }`}
            >
              {pendingCount}
            </p>
          </CardContent>
        </Card>
        <Card
          className={
            signaturePendingCount > 0
              ? "border-orange-300 bg-orange-50"
              : ""
          }
        >
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Awaiting Signature</p>
            <p
              className={`text-2xl font-bold ${
                signaturePendingCount > 0
                  ? "text-orange-600"
                  : "text-gray-600"
              }`}
            >
              {signaturePendingCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Document List */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">
            All Documents
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No documents yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Documents assigned to you will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {documents.map((doc) => {
                const statusInfo =
                  STATUS_CONFIG[doc.status] || STATUS_CONFIG.PENDING;
                const StatusIcon = statusInfo.icon;
                const canAcknowledge =
                  doc.status === "PENDING" || doc.status === "VIEWED";
                const needsSignature = doc.status === "SIGNATURE_PENDING";

                return (
                  <div
                    key={doc.id}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Document Icon & Info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-brand-navy/10 flex items-center justify-center flex-shrink-0">
                          <DocumentTextIcon className="h-5 w-5 text-brand-navy" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-gray-900 truncate">
                            {doc.title}
                          </h3>
                          {doc.description && (
                            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                              {doc.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {/* Doc Type Badge */}
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              {DOC_TYPE_LABELS[doc.docType] || doc.docType}
                            </span>
                            {/* Status Badge */}
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {statusInfo.label}
                            </span>
                            {/* File info */}
                            <span className="text-xs text-gray-400">
                              {doc.fileName} ({formatFileSize(doc.fileSize)})
                            </span>
                          </div>
                          {doc.acknowledgedAt && (
                            <p className="text-xs text-gray-400 mt-1">
                              Acknowledged on{" "}
                              {formatDate(doc.acknowledgedAt)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0 sm:ml-4">
                        {/* Download Button */}
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          Download
                        </a>

                        {/* Acknowledge Button */}
                        {canAcknowledge && (
                          <button
                            onClick={() => handleAcknowledgeClick(doc.id)}
                            disabled={acknowledging === doc.id}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-brand-navy rounded-lg hover:bg-brand-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {acknowledging === doc.id ? (
                              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <CheckCircleIcon className="h-4 w-4" />
                            )}
                            Acknowledge
                          </button>
                        )}

                        {/* Sign Document Link */}
                        {needsSignature && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors cursor-pointer">
                            <PencilSquareIcon className="h-4 w-4" />
                            Sign Document
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Acknowledge Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Acknowledge Document
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              By acknowledging this document, you confirm that you have
              reviewed and understood its contents. This action cannot be
              undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedDocId(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAcknowledge}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-navy rounded-lg hover:bg-brand-navy/90 transition-colors"
              >
                Confirm Acknowledgment
              </button>
            </div>
          </div>
        </div>
      )}
    </WideContainer>
  );
}
