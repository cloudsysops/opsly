"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { BoltIcon } from "@heroicons/react/24/solid";

const TRIGGER_LABELS: Record<string, string> = {
  NEW_INQUIRY: "New Inquiry",
  STAGE_CHANGE: "Stage Change",
  INACTIVITY: "Inactivity",
  FORM_SUBMITTED: "Form Submitted",
  PREWORK_COMPLETED: "Pre-work Completed",
  MANUAL: "Manual Trigger",
};

function TriggerNode({ data, selected }: NodeProps) {
  const triggerType = (data.triggerType as string) || "MANUAL";
  const label = TRIGGER_LABELS[triggerType] || triggerType;
  const stats = data.stats as { runCount?: number } | undefined;

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-white min-w-[160px] shadow-sm ${
        selected
          ? "border-green-600 ring-2 ring-green-200"
          : "border-green-400"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-green-100">
          <BoltIcon className="w-4 h-4 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wider text-green-600">
            Trigger
          </div>
          <div className="text-sm font-medium text-gray-900 truncate">
            {label}
          </div>
        </div>
      </div>

      {stats?.runCount !== undefined && (
        <div className="mt-2 text-xs text-gray-500">
          {stats.runCount} run{stats.runCount !== 1 ? "s" : ""}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-green-500 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(TriggerNode);
