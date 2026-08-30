"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function NewWorkflowPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function createWorkflow() {
      try {
        const res = await fetch("/api/admin/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "New Workflow",
            triggerType: "NEW_INQUIRY",
            triggerConfig: {},
            category: "custom",
          }),
        });
        const data = await res.json();
        if (data.workflow?.id) {
          router.replace(`/admin/workflows/${data.workflow.id}/builder`);
        } else {
          setError("Failed to create workflow");
        }
      } catch {
        setError("Failed to create workflow");
      }
    }
    createWorkflow();
  }, [router]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a
            href="/admin/workflows"
            className="text-brand-cyan hover:underline"
          >
            Back to workflows
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
    </div>
  );
}
