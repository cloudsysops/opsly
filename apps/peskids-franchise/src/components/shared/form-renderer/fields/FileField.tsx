"use client";

import { useState, useRef } from "react";
import { FormField, FormFieldValue } from "@/lib/types/form-schema";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

interface FileFieldProps {
  field: FormField;
  value: FormFieldValue | undefined;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
  onFileUpload?: (file: File) => Promise<string>;
}

export function FileField({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  onFileUpload,
}: FileFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (field.maxSize && file.size > field.maxSize) {
      setAlertMsg(`File size must be less than ${formatFileSize(field.maxSize)}`);
      return;
    }

    setFileName(file.name);

    if (onFileUpload) {
      setUploading(true);
      try {
        const url = await onFileUpload(file);
        onChange(url);
      } catch (err) {
        console.error("File upload failed:", err);
        setAlertMsg("Failed to upload file. Please try again.");
      } finally {
        setUploading(false);
      }
    } else {
      // Store as base64 for simple forms (not recommended for large files)
      const reader = new FileReader();
      reader.onload = () => {
        onChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFile = () => {
    onChange("");
    setFileName(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && (
        <p className="text-sm text-gray-500">{field.description}</p>
      )}

      <div className="flex items-center gap-4">
        <div className="flex-1">
          {value ? (
            <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="text-sm text-gray-700 flex-1 truncate">
                {fileName || "File uploaded"}
              </span>
              <button
                type="button"
                onClick={clearFile}
                disabled={disabled}
                className="text-gray-400 hover:text-red-500"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <label
              className={`
                flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg
                cursor-pointer transition-colors
                ${
                  disabled
                    ? "bg-gray-100 cursor-not-allowed"
                    : "hover:border-brand-purple hover:bg-brand-purple/5"
                }
                ${error ? "border-red-500" : "border-gray-300"}
              `}
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple" />
              ) : (
                <>
                  <svg
                    className="w-8 h-8 text-gray-400 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    {field.accept || "Any file"} (max{" "}
                    {formatFileSize(field.maxSize || 10 * 1024 * 1024)})
                  </span>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                id={field.id}
                name={field.name}
                onChange={handleFileChange}
                onBlur={onBlur}
                disabled={disabled || uploading}
                accept={field.accept}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

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
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
