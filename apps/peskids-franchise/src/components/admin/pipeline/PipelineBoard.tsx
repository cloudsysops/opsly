"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { PipelineProspect } from "./pipelineConfig";
import { usePipelineData } from "./usePipelineData";
import { PipelineColumn } from "./PipelineColumn";
import { PipelineCard } from "./PipelineCard";
import { PipelineSummaryBar } from "./PipelineSummaryBar";
import { PipelineFilters } from "./PipelineFilters";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

interface PipelineBoardProps {
  initialProspects: PipelineProspect[];
}

export function PipelineBoard({ initialProspects }: PipelineBoardProps) {
  const {
    columnData,
    stats,
    territories,
    filters,
    pendingMove,
    requestMove,
    confirmMove,
    cancelMove,
    isMoving,
    error,
  } = usePipelineData(initialProspects);

  const [activeProspect, setActiveProspect] = useState<PipelineProspect | null>(null);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  });
  const keyboardSensor = useSensor(KeyboardSensor);

  const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const prospectId = event.active.id as string;
      // Find the prospect across all columns
      for (const col of columnData) {
        const found = col.prospects.find((p) => p.id === prospectId);
        if (found) {
          setActiveProspect(found);
          break;
        }
      }
    },
    [columnData]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveProspect(null);
      const { active, over } = event;
      if (!over) return;

      const prospectId = active.id as string;
      const targetColumnId = over.id as string;

      requestMove(prospectId, targetColumnId);
    },
    [requestMove]
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">Pipeline Board</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
          Drag and drop prospects between stages
        </p>
      </div>

      <PipelineSummaryBar stats={stats} />
      <PipelineFilters filters={filters} territories={territories} />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
          <div
            className="flex gap-3 sm:gap-4 lg:grid lg:grid-cols-5"
            style={{ minWidth: "min(1400px, max-content)" }}
          >
            {columnData.map(({ column, prospects }) => (
              <PipelineColumn
                key={column.id}
                column={column}
                prospects={prospects}
                isMoving={isMoving}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeProspect ? (
            <div className="transform scale-105 rotate-2 opacity-90">
              <PipelineCard prospect={activeProspect} isDragOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <ConfirmModal
        isOpen={!!pendingMove}
        title="Move Prospect"
        message={
          pendingMove
            ? `Move ${pendingMove.prospectName} from "${pendingMove.fromColumn.label}" to "${pendingMove.toColumn.label}"?`
            : ""
        }
        confirmLabel="Move"
        cancelLabel="Cancel"
        confirmVariant="primary"
        onConfirm={confirmMove}
        onCancel={cancelMove}
      />
    </div>
  );
}
