"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/solid";
import { OPERATOR_LABELS } from "@/lib/automation/conditions";

function ConditionNode({ data, selected }: NodeProps) {
  const field = data.field as string | undefined;
  const operator = data.operator as string | undefined;
  const value = data.value as string | undefined;

  let summary = "Configure condition...";
  if (field && operator) {
    const operatorLabel = OPERATOR_LABELS[operator] || operator;
    summary = `${field} ${operatorLabel} ${value || ""}`.trim();
  }

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-white min-w-[160px] shadow-sm ${
        selected
          ? "border-purple-600 ring-2 ring-purple-200"
          : "border-purple-400"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-purple-500 !w-3 !h-3"
      />

      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-purple-100">
          <QuestionMarkCircleIcon className="w-4 h-4 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wider text-purple-600">
            Condition
          </div>
          <div className="text-sm font-medium text-gray-900 truncate">
            {summary}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-green-600 font-medium">Yes &rarr;</span>
        <span className="text-red-600 font-medium">No &darr;</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="yes"
        className="!bg-green-500 !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        className="!bg-red-500 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(ConditionNode);
