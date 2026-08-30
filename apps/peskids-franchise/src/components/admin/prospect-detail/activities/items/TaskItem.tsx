"use client";

import { formatDate } from "@/lib/utils";

interface TaskItemProps {
  data: {
    id: string;
    title: string;
    description: string | null;
    dueDate: string | null;
    priority: string;
    status: string;
    assignedTo: string | null;
    completedAt: string | null;
    createdBy: string;
    createdAt: string;
  };
}

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function TaskItem({ data }: TaskItemProps) {
  const isOverdue =
    data.dueDate &&
    data.status !== "COMPLETED" &&
    data.status !== "CANCELLED" &&
    new Date(data.dueDate) < new Date();

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-brand-yellow"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <span className="text-sm font-medium text-brand-navy">Task</span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
              statusColors[data.status] || "bg-gray-100 text-gray-600"
            }`}
          >
            {statusLabels[data.status] || data.status}
          </span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
              priorityColors[data.priority] || "bg-gray-100 text-gray-600"
            }`}
          >
            {data.priority}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {formatDate(new Date(data.createdAt))}
        </span>
      </div>

      <div className="mb-2">
        <div
          className={`text-sm font-medium ${
            data.status === "COMPLETED" ? "text-gray-500 line-through" : "text-gray-900"
          }`}
        >
          {data.title}
        </div>
        {data.dueDate && (
          <div
            className={`text-xs mt-0.5 ${
              isOverdue ? "text-red-600 font-medium" : "text-gray-500"
            }`}
          >
            {isOverdue ? "Overdue: " : "Due: "}
            {formatDate(new Date(data.dueDate))}
          </div>
        )}
        {data.assignedTo && (
          <div className="text-xs text-gray-500 mt-0.5">
            Assigned to: {data.assignedTo}
          </div>
        )}
      </div>

      {data.description && (
        <p className="text-sm text-gray-600">{data.description}</p>
      )}

      {data.completedAt && (
        <div className="mt-2 text-xs text-green-600">
          Completed {formatDate(new Date(data.completedAt))}
        </div>
      )}
    </div>
  );
}
