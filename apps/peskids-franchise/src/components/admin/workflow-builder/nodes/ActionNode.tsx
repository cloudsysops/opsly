"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import {
  EnvelopeIcon,
  ClipboardDocumentListIcon,
  BellAlertIcon,
  ArrowRightCircleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/solid";

const ACTION_LABELS: Record<string, string> = {
  SEND_EMAIL: "Send Email",
  CREATE_TASK: "Create Task",
  NOTIFY_ADMIN: "Notify Admin",
  CHANGE_STAGE: "Change Stage",
  ADD_NOTE: "Add Note",
};

const ACTION_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  SEND_EMAIL: EnvelopeIcon,
  CREATE_TASK: ClipboardDocumentListIcon,
  NOTIFY_ADMIN: BellAlertIcon,
  CHANGE_STAGE: ArrowRightCircleIcon,
  ADD_NOTE: DocumentTextIcon,
};

function ActionNode({ data, selected }: NodeProps) {
  const actionType = (data.actionType as string) || "SEND_EMAIL";
  const label = (data.label as string) || ACTION_LABELS[actionType] || actionType;
  const description = data.description as string | undefined;
  const stats = data.stats as { runCount?: number } | undefined;
  const Icon = ACTION_ICONS[actionType] || EnvelopeIcon;

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-white min-w-[160px] shadow-sm ${
        selected
          ? "border-blue-600 ring-2 ring-blue-200"
          : "border-blue-400"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-blue-500 !w-3 !h-3"
      />

      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-blue-100">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wider text-blue-600">
            Action
          </div>
          <div className="text-sm font-medium text-gray-900 truncate">
            {label}
          </div>
        </div>
      </div>

      {description && (
        <div className="mt-1 text-xs text-gray-500 truncate">{description}</div>
      )}

      {stats?.runCount !== undefined && (
        <div className="mt-2 text-xs text-gray-500">
          {stats.runCount} run{stats.runCount !== 1 ? "s" : ""}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(ActionNode);
