"use client";

import { useState } from "react";
import {
  XMarkIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

interface ShareDialogProps {
  territoryIds?: string[];
  isOpen: boolean;
  onClose: () => void;
}

const EXPIRY_OPTIONS = [
  { value: 1, label: "1 day" },
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 0, label: "Never" },
];

export default function ShareDialog({
  territoryIds,
  isOpen,
  onClose,
}: ShareDialogProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [expiryDays, setExpiryDays] = useState(7);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/territories/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          territoryIds,
          expiryDays: expiryDays || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate share link");
      const data = await res.json();
      setShareUrl(data.shareUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-brand-navy" />
            <h3 className="text-sm font-semibold text-gray-900">
              Share Territory Map
            </h3>
          </div>
          <button type="button" onClick={onClose}>
            <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!shareUrl ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Link Expiry
                </label>
                <div className="flex gap-2">
                  {EXPIRY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setExpiryDays(opt.value)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        expiryDays === opt.value
                          ? "bg-brand-navy text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : "Generate Share Link"}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Share Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    {copied ? (
                      <CheckIcon className="h-4 w-4 text-brand-green" />
                    ) : (
                      <ClipboardDocumentIcon className="h-4 w-4 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                {expiryDays > 0
                  ? `This link will expire in ${expiryDays} day${expiryDays > 1 ? "s" : ""}.`
                  : "This link will never expire."}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
