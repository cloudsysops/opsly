"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DocumentType, SignatureStatus } from "@prisma/client";
import {
  DocumentTextIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface DocumentSignerProps {
  documentType: DocumentType;
  documentTitle: string;
  documentDescription: string;
  currentStatus: SignatureStatus | null;
  signatureRequestId?: string | null;
  onSigningComplete?: () => void;
}

export default function DocumentSigner({
  documentType,
  documentTitle,
  documentDescription,
  currentStatus,
  signatureRequestId,
  onSigningComplete,
}: DocumentSignerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [signUrl, setSignUrl] = useState<string | null>(null);
  const [signerSignatureId, setSignerSignatureId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Listen for Dropbox Sign client events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only process messages from Dropbox Sign
      if (
        event.origin !== "https://app.hellosign.com" &&
        event.origin !== "https://app.dropboxsign.com"
      ) {
        return;
      }

      const data = event.data;

      switch (data.event) {
        case "signature_request_signed":
          setShowModal(false);
          setSignUrl(null);
          onSigningComplete?.();
          break;

        case "signature_request_declined":
          setShowModal(false);
          setSignUrl(null);
          setError("Document signing was declined");
          break;

        case "signature_request_canceled":
          setShowModal(false);
          setSignUrl(null);
          break;

        case "error":
          setError(data.description || "An error occurred during signing");
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSigningComplete]);

  const handleStartSigning = async () => {
    setLoading(true);
    setError(null);

    try {
      // If we don't have a signature request yet, create one
      if (!signatureRequestId) {
        const createResponse = await fetch("/api/documents/signature-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentType,
            // In production, you'd provide templateId or fileUrl
            // For now, this will need to be configured
          }),
        });

        if (!createResponse.ok) {
          const data = await createResponse.json();
          throw new Error(data.error || "Failed to create signature request");
        }

        const createData = await createResponse.json();
        setSignerSignatureId(createData.signerSignatureId);

        // Now get the sign URL
        const signResponse = await fetch("/api/documents/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId: createData.documentId,
            signatureId: createData.signerSignatureId,
          }),
        });

        if (!signResponse.ok) {
          const data = await signResponse.json();
          throw new Error(data.error || "Failed to get signing URL");
        }

        const signData = await signResponse.json();
        setSignUrl(signData.signUrl);
        setShowModal(true);
      } else {
        // We already have a signature request, just get the sign URL
        // We need the signature ID which isn't stored - for now, show error
        setError("Please contact support to continue signing this document.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = () => {
    switch (currentStatus) {
      case SignatureStatus.SIGNED:
        return {
          icon: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
          text: "Signed",
          className: "text-green-600 bg-green-50",
        };
      case SignatureStatus.SENT:
      case SignatureStatus.VIEWED:
        return {
          icon: <ClockIcon className="h-5 w-5 text-amber-500" />,
          text: "Awaiting Signature",
          className: "text-amber-600 bg-amber-50",
        };
      case SignatureStatus.DECLINED:
        return {
          icon: <XCircleIcon className="h-5 w-5 text-red-500" />,
          text: "Declined",
          className: "text-red-600 bg-red-50",
        };
      case SignatureStatus.EXPIRED:
        return {
          icon: <ExclamationTriangleIcon className="h-5 w-5 text-slate-500" />,
          text: "Expired",
          className: "text-slate-600 bg-slate-50",
        };
      case SignatureStatus.ERROR:
        return {
          icon: <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />,
          text: "Error",
          className: "text-red-600 bg-red-50",
        };
      default:
        return {
          icon: <DocumentTextIcon className="h-5 w-5 text-slate-400" />,
          text: "Not Started",
          className: "text-slate-600 bg-slate-50",
        };
    }
  };

  const status = getStatusDisplay();
  const canSign =
    !currentStatus ||
    currentStatus === SignatureStatus.PENDING ||
    currentStatus === SignatureStatus.SENT ||
    currentStatus === SignatureStatus.VIEWED ||
    currentStatus === SignatureStatus.EXPIRED;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-4 bg-white border border-slate-200 rounded-lg">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex-shrink-0 p-2 bg-slate-100 rounded-lg">
            <DocumentTextIcon className="h-5 w-5 sm:h-6 sm:w-6 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base">{documentTitle}</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">{documentDescription}</p>

            {error && (
              <p className="text-xs sm:text-sm text-red-600 mt-2 flex items-center gap-1">
                <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap sm:flex-nowrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${status.className}`}
          >
            {status.icon}
            {status.text}
          </span>

          {canSign && (
            <button
              onClick={handleStartSigning}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-brand-navy text-white rounded-lg text-sm font-medium hover:bg-[#3a3c9e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-0"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                  Loading...
                </>
              ) : (
                <>
                  <PencilSquareIcon className="h-4 w-4" />
                  Sign Document
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Signing Modal */}
      {showModal && signUrl && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-4xl h-[90vh] sm:h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-200">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate pr-2">
                Sign: {documentTitle}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSignUrl(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                ref={iframeRef}
                src={signUrl}
                className="w-full h-full border-0"
                title="Document Signing"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
