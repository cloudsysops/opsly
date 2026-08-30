"use client";

import { useState } from "react";
import { FormSchema } from "@/lib/types/form-schema";
import { DynamicFormRenderer } from "@/components/shared/form-renderer";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

interface FormPreviewProps {
  schema: FormSchema;
}

export function FormPreview({ schema }: FormPreviewProps) {
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  if (schema.fields.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No fields to preview</p>
        <p className="text-sm mt-1">Add fields to see the form preview</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Form Preview</h3>
        <p className="text-sm text-gray-500">This is how the form will appear to prospects</p>
      </div>

      <DynamicFormRenderer
        schema={schema}
        onSubmit={(values) => {
          console.log("Preview form submitted:", values);
          setAlertMsg("Form submitted! Check console for values.");
        }}
        submitLabel="Preview Submit"
      />

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
