"use client";

import { useDroppable } from "@dnd-kit/core";
import { PipelineProspect, BoardColumn } from "./pipelineConfig";
import { PipelineCard } from "./PipelineCard";

interface PipelineColumnProps {
  column: BoardColumn;
  prospects: PipelineProspect[];
  isMoving: boolean;
}

export function PipelineColumn({ column, prospects, isMoving }: PipelineColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[280px] lg:w-auto lg:flex-1 bg-gray-50 rounded-xl p-3 sm:p-4 snap-start transition-all duration-200 ${
        isOver ? "ring-2 ring-brand-cyan/50 bg-blue-50/30" : ""
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${column.color}`} />
          <h3 className="font-semibold text-brand-navy text-sm">{column.label}</h3>
        </div>
        <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-full shadow-sm">
          {prospects.length}
        </span>
      </div>

      {/* Card List */}
      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
        {prospects.map((prospect) => (
          <PipelineCard key={prospect.id} prospect={prospect} />
        ))}

        {prospects.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">No prospects</div>
        )}
      </div>

      {/* Loading indicator during move */}
      {isMoving && isOver && (
        <div className="mt-2 text-center text-xs text-brand-cyan animate-pulse">
          Moving...
        </div>
      )}
    </div>
  );
}
