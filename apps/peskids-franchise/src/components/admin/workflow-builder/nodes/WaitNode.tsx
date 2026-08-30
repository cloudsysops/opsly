"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { ClockIcon } from "@heroicons/react/24/solid";

function formatDelay(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  if (minutes < 1440) {
    const hours = Math.round(minutes / 60);
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  const days = Math.round(minutes / 1440);
  return `${days} day${days !== 1 ? "s" : ""}`;
}

function WaitNode({ data, selected }: NodeProps) {
  const delayMinutes = (data.delayMinutes as number) || 0;

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-white min-w-[160px] shadow-sm ${
        selected
          ? "border-amber-600 ring-2 ring-amber-200"
          : "border-amber-400"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-amber-500 !w-3 !h-3"
      />

      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-amber-100">
          <ClockIcon className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wider text-amber-600">
            Wait
          </div>
          <div className="text-sm font-medium text-gray-900 truncate">
            {delayMinutes > 0 ? formatDelay(delayMinutes) : "No delay"}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-amber-500 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(WaitNode);
