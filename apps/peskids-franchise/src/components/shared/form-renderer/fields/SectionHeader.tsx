"use client";

import { FormField } from "@/lib/types/form-schema";

interface SectionHeaderProps {
  field: FormField;
}

export function SectionHeader({ field }: SectionHeaderProps) {
  return (
    <div className="pt-4 pb-2 border-b border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900">{field.label}</h3>
      {field.description && (
        <p className="mt-1 text-sm text-gray-500">{field.description}</p>
      )}
    </div>
  );
}
