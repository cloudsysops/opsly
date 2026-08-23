"use client";

import Link from "next/link";
import { ExecutionHistory } from "@/components/admin/workflow-builder/ExecutionHistory";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

export default function WorkflowHistoryPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  return (
    <div className="py-6 px-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/admin/workflows/${id}/builder`}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">
            Execution History
          </h1>
          <p className="text-sm text-gray-600">
            View all workflow execution records
          </p>
        </div>
      </div>
      <ExecutionHistory workflowId={id} />
    </div>
  );
}
