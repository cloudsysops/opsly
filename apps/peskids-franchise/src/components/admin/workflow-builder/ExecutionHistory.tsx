"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";

// ============================================
// TYPES
// ============================================

interface ExecutionProspect {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ExecutionAction {
  actionType: string;
  nodeId: string;
}

interface Execution {
  id: string;
  prospect: ExecutionProspect;
  action: ExecutionAction;
  status: string;
  scheduledFor: string | null;
  executedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface ExecutionsResponse {
  executions: Execution[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

interface ExecutionHistoryProps {
  workflowId: string;
}

// ============================================
// ACTION TYPE LABELS
// ============================================

const ACTION_TYPE_LABELS: Record<string, string> = {
  SEND_EMAIL: "Send Email",
  SEND_SMS: "Send SMS",
  ADD_TAG: "Add Tag",
  REMOVE_TAG: "Remove Tag",
  UPDATE_STAGE: "Update Stage",
  ASSIGN_OWNER: "Assign Owner",
  CREATE_TASK: "Create Task",
  WAIT_DELAY: "Wait / Delay",
  WAIT_UNTIL: "Wait Until",
  IF_ELSE: "If / Else",
  WEBHOOK: "Webhook",
  ADD_NOTE: "Add Note",
};

function getActionLabel(actionType: string): string {
  return ACTION_TYPE_LABELS[actionType] || actionType.replace(/_/g, " ");
}

// ============================================
// STATUS BADGE
// ============================================

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  RUNNING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-700",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || "bg-gray-100 text-gray-700";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ============================================
// STATUS FILTER OPTIONS
// ============================================

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "RUNNING", label: "Running" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
];

// ============================================
// DATE FORMATTER
// ============================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  try {
    return format(new Date(dateStr), "MMM d, yyyy h:mm a");
  } catch {
    return "\u2014";
  }
}

// ============================================
// COMPONENT
// ============================================

export function ExecutionHistory({ workflowId }: ExecutionHistoryProps) {
  const [data, setData] = useState<ExecutionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchExecutions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter) {
        params.set("status", statusFilter);
      }
      const res = await fetch(
        `/api/admin/workflows/${workflowId}/executions?${params.toString()}`
      );
      if (res.ok) {
        const json: ExecutionsResponse = await res.json();
        setData(json);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [workflowId, page, statusFilter]);

  useEffect(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  // Reset to page 1 when filter changes
  function handleFilterChange(newStatus: string) {
    setStatusFilter(newStatus);
    setPage(1);
  }

  // ----------------------------------------
  // LOADING STATE
  // ----------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-navy" />
      </div>
    );
  }

  // ----------------------------------------
  // EMPTY STATE
  // ----------------------------------------
  if (!data || (data.total === 0 && !statusFilter)) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">
          No executions yet. Activate this workflow and it will start processing
          prospects.
        </p>
      </div>
    );
  }

  const { executions, total, perPage, totalPages } = data;
  const startItem = (page - 1) * perPage + 1;
  const endItem = Math.min(page * perPage, total);

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <label
            htmlFor="status-filter"
            className="text-sm font-medium text-gray-700"
          >
            Status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {total > 0 && (
          <span className="text-sm text-gray-500">
            Showing {startItem}-{endItem} of {total}
          </span>
        )}
      </div>

      {/* Table */}
      {executions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No executions match the selected filter.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Prospect
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Scheduled For
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Executed At
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Error
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {executions.map((execution) => (
                <tr key={execution.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <Link
                      href={`/admin/crm/prospects/${execution.prospect.id}`}
                      className="font-medium text-brand-navy hover:text-brand-purple transition-colors"
                    >
                      {execution.prospect.firstName}{" "}
                      {execution.prospect.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {getActionLabel(execution.action.actionType)}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <StatusBadge status={execution.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {formatDate(execution.scheduledFor)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {formatDate(execution.executedAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-red-600 max-w-[200px] truncate">
                    {execution.errorMessage || ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              page <= 1
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              page >= totalPages
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
