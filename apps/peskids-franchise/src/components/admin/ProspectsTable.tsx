"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

interface Prospect {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  preferredTerritory: string | null;
  interestLevel: string;
  pipelineStage: string;
  prospectScore: number;
  createdAt: Date;
}

interface ProspectsTableProps {
  prospects: Prospect[];
  stageLabels: Record<string, string>;
  stageColors: Record<string, string>;
  interestLabels: Record<string, string>;
}

export function ProspectsTable({
  prospects,
  stageLabels,
  stageColors,
  interestLabels,
}: ProspectsTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState<"delete" | "reject" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const allSelected = prospects.length > 0 && selected.size === prospects.length;
  const someSelected = selected.size > 0 && selected.size < prospects.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(prospects.map((p) => p.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  }

  async function handleBulkAction(action: "delete" | "reject") {
    setIsProcessing(true);
    setMessage(null);

    try {
      const response = await fetch("/api/prospects/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          prospectIds: Array.from(selected),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} prospects`);
      }

      setMessage({
        type: "success",
        text: `Successfully ${action === "delete" ? "deleted" : "rejected"} ${data.count} prospect${data.count !== 1 ? "s" : ""}`,
      });
      setSelected(new Set());
      setShowConfirm(null);
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : `Failed to ${action} prospects`,
      });
    } finally {
      setIsProcessing(false);
    }
  }

  const selectedProspects = prospects.filter((p) => selected.has(p.id));

  return (
    <>
      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="bg-brand-navy text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
          <span className="text-sm font-medium">
            {selected.size} prospect{selected.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirm("reject")}
              disabled={isProcessing}
              className="px-3 py-1.5 bg-yellow-500 text-white rounded text-sm font-medium hover:bg-yellow-600 transition-colors disabled:opacity-50"
            >
              Mark Rejected
            </button>
            <button
              onClick={() => setShowConfirm("delete")}
              disabled={isProcessing}
              className="px-3 py-1.5 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              Delete
            </button>
            <button
              onClick={() => setSelected(new Set())}
              disabled={isProcessing}
              className="px-3 py-1.5 bg-white/20 text-white rounded text-sm font-medium hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Success/Error Message */}
      {message && (
        <div
          className={`px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border-b border-green-100"
              : "bg-red-50 text-red-700 border-b border-red-100"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-100">
        {prospects.map((prospect) => (
          <div
            key={prospect.id}
            className="flex items-start gap-3 p-4 hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={selected.has(prospect.id)}
              onChange={() => toggleOne(prospect.id)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-purple focus:ring-brand-cyan"
            />
            <Link
              href={`/admin/prospects/${prospect.id}`}
              className="flex-1 min-w-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-brand-navy">
                    {prospect.firstName} {prospect.lastName}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {prospect.email}
                  </div>
                  {prospect.preferredTerritory && (
                    <div className="text-sm text-gray-600 mt-1">
                      {prospect.preferredTerritory}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      stageColors[prospect.pipelineStage]
                    }`}
                  >
                    {stageLabels[prospect.pipelineStage]}
                  </span>
                  <span className="text-sm font-medium text-brand-navy">
                    Score: {prospect.prospectScore}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                <span>{interestLabels[prospect.interestLevel] || prospect.interestLevel}</span>
                <span>{formatDate(prospect.createdAt)}</span>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 lg:px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-brand-purple focus:ring-brand-cyan"
                />
              </th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Prospect
              </th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Territory
              </th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                Interest
              </th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Stage
              </th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                Created
              </th>
              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {prospects.map((prospect) => (
              <tr
                key={prospect.id}
                className={`hover:bg-gray-50 ${selected.has(prospect.id) ? "bg-brand-light" : ""}`}
              >
                <td className="px-4 lg:px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selected.has(prospect.id)}
                    onChange={() => toggleOne(prospect.id)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-purple focus:ring-brand-cyan"
                  />
                </td>
                <td className="px-4 lg:px-6 py-4">
                  <div>
                    <Link
                      href={`/admin/prospects/${prospect.id}`}
                      className="font-medium text-brand-navy hover:text-brand-purple"
                    >
                      {prospect.firstName} {prospect.lastName}
                    </Link>
                    <div className="text-sm text-gray-500 truncate max-w-[200px]">
                      {prospect.email}
                    </div>
                  </div>
                </td>
                <td className="px-4 lg:px-6 py-4 text-sm text-gray-600">
                  {prospect.preferredTerritory || "—"}
                </td>
                <td className="px-4 lg:px-6 py-4 hidden lg:table-cell">
                  <span className="text-sm text-gray-600">
                    {interestLabels[prospect.interestLevel] || prospect.interestLevel}
                  </span>
                </td>
                <td className="px-4 lg:px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      stageColors[prospect.pipelineStage]
                    }`}
                  >
                    {stageLabels[prospect.pipelineStage]}
                  </span>
                </td>
                <td className="px-4 lg:px-6 py-4">
                  <span className="text-sm font-medium text-brand-navy">
                    {prospect.prospectScore}
                  </span>
                </td>
                <td className="px-4 lg:px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                  {formatDate(prospect.createdAt)}
                </td>
                <td className="px-4 lg:px-6 py-4 text-right">
                  <Link
                    href={`/admin/prospects/${prospect.id}`}
                    className="text-brand-purple hover:text-brand-navy text-sm font-medium"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {prospects.length === 0 && (
        <div className="px-6 py-12 text-center text-gray-500">
          No prospects found matching your criteria.
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  showConfirm === "delete" ? "bg-red-100" : "bg-yellow-100"
                }`}
              >
                <svg
                  className={`w-5 h-5 ${showConfirm === "delete" ? "text-red-600" : "text-yellow-600"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {showConfirm === "delete" ? "Delete" : "Reject"} {selected.size} Prospect
                  {selected.size !== 1 ? "s" : ""}
                </h3>
                <p className="text-sm text-gray-500">
                  {showConfirm === "delete"
                    ? "This action cannot be undone"
                    : "Move to rejected stage"}
                </p>
              </div>
            </div>

            <div className="mb-4 max-h-48 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-2">
                {showConfirm === "delete"
                  ? "The following prospects will be permanently deleted:"
                  : "The following prospects will be marked as rejected:"}
              </p>
              <ul className="text-sm space-y-1 bg-gray-50 rounded-lg p-3">
                {selectedProspects.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span className="font-medium">
                      {p.firstName} {p.lastName}
                    </span>
                    <span className="text-gray-500">{p.email}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(null)}
                disabled={isProcessing}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBulkAction(showConfirm)}
                disabled={isProcessing}
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  showConfirm === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-yellow-600 hover:bg-yellow-700"
                }`}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing...
                  </>
                ) : showConfirm === "delete" ? (
                  "Delete Permanently"
                ) : (
                  "Mark as Rejected"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
