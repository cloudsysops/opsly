"use client";

import { FormField } from "@/lib/types/form-schema";

interface InfoBoxProps {
  field: FormField;
}

export function InfoBox({ field }: InfoBoxProps) {
  const variants = {
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: "text-blue-500",
      text: "text-blue-800",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      icon: "text-yellow-500",
      text: "text-yellow-800",
    },
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      icon: "text-green-500",
      text: "text-green-800",
    },
  };

  const variant = variants[field.variant || "info"];

  return (
    <div
      className={`
        flex gap-3 p-4 rounded-lg border
        ${variant.bg} ${variant.border}
      `}
    >
      <div className={`flex-shrink-0 ${variant.icon}`}>
        {field.variant === "warning" ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ) : field.variant === "success" ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <div className={variant.text}>
        {field.label && (
          <h4 className="font-medium mb-1">{field.label}</h4>
        )}
        {field.description && (
          <p className="text-sm">{field.description}</p>
        )}
      </div>
    </div>
  );
}
