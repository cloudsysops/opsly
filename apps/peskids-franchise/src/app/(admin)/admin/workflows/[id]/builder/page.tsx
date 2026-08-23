"use client";

import dynamic from "next/dynamic";

// React Flow depends on d3 (ESM-only) and browser APIs — must skip SSR
const WorkflowCanvas = dynamic(
  () => import("@/components/admin/workflow-builder/WorkflowCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>
    ),
  }
);

export default function WorkflowBuilderPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  return (
    <div className="h-[calc(100vh-8rem)]">
      <WorkflowCanvas workflowId={id} />
    </div>
  );
}
