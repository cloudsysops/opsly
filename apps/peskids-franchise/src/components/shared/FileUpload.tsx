"use client";

import { useState, useRef, useEffect } from "react";
import {
  DocumentIcon,
  PhotoIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";

interface FileData {
  name: string;
  type: string;
  size: number;
  data: string; // base64
}

interface FileUploadProps {
  name: string;
  label: string;
  accept?: string;
  maxSizeMB?: number;
  existingFile?: FileData | null;
  disabled?: boolean;
  required?: boolean;
  onChange?: (file: FileData | null) => void;
}

export function FileUpload({
  name,
  label,
  accept = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg",
  maxSizeMB = 5,
  existingFile,
  disabled = false,
  required = false,
  onChange,
}: FileUploadProps) {
  const [file, setFile] = useState<FileData | null>(existingFile || null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingFile) {
      setFile(existingFile);
    }
  }, [existingFile]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);

    // Validate file size
    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    setIsLoading(true);

    try {
      // Convert to base64
      const base64 = await fileToBase64(selectedFile);

      const fileData: FileData = {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        data: base64,
      };

      setFile(fileData);
      onChange?.(fileData);
    } catch (err) {
      setError("Failed to read file");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    onChange?.(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleDownload = () => {
    if (!file) return;

    // Create blob from base64
    const byteCharacters = atob(file.data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: file.type });

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = () => {
    if (!file) return null;
    if (file.type.startsWith("image/")) {
      return <PhotoIcon className="h-8 w-8 text-brand-cyan" />;
    }
    return <DocumentIcon className="h-8 w-8 text-brand-purple" />;
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Hidden input to store the file data for form submission */}
      <input type="hidden" name={name} value={file ? JSON.stringify(file) : ""} />

      {!file ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            disabled
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : "border-gray-300 hover:border-brand-cyan cursor-pointer"
          }`}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            disabled={disabled}
            className="hidden"
          />

          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-cyan border-t-transparent" />
              <p className="text-sm text-gray-500">Processing file...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ArrowUpTrayIcon className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-600">
                <span className="text-brand-cyan font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                PDF, Word, Excel, or images up to {maxSizeMB}MB
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center gap-4">
            {getFileIcon()}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="p-2 text-gray-500 hover:text-brand-cyan transition-colors"
                title="Download"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </button>
              {!disabled && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                  title="Remove"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:*;base64, prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

// Component to display an existing uploaded file
export function FileDisplay({ file }: { file: FileData }) {
  const handleDownload = () => {
    const byteCharacters = atob(file.data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: file.type });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const isImage = file.type.startsWith("image/");

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex items-center gap-4">
        {isImage ? (
          <PhotoIcon className="h-8 w-8 text-brand-cyan" />
        ) : (
          <DocumentIcon className="h-8 w-8 text-brand-purple" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-brand-cyan hover:text-brand-purple transition-colors"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Download
        </button>
      </div>
    </div>
  );
}
