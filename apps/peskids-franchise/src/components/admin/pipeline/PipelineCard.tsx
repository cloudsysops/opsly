"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { ClockIcon } from "@heroicons/react/24/outline";
import { getInitials } from "@/lib/utils";
import {
  PipelineProspect,
  getScoreBadgeClasses,
  getDaysInStage,
  getMergedStageLabel,
  getPreWorkBadgeClasses,
  getColumnForStage,
  STALE_THRESHOLD_DAYS,
} from "./pipelineConfig";

interface PipelineCardProps {
  prospect: PipelineProspect;
  isDragOverlay?: boolean;
}

export function PipelineCard({ prospect, isDragOverlay }: PipelineCardProps) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: prospect.id,
    disabled: isDragOverlay,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const daysInStage = getDaysInStage(prospect.updatedAt);
  const isStale = daysInStage >= STALE_THRESHOLD_DAYS;
  const mergedLabel = getMergedStageLabel(prospect.pipelineStage);
  const column = getColumnForStage(prospect.pipelineStage);
  const isPreWorkStage = prospect.pipelineStage === "PRE_WORK_IN_PROGRESS" || prospect.pipelineStage === "PRE_WORK_COMPLETE";

  const handleClick = () => {
    if (!isDragging) {
      router.push(`/admin/prospects/${prospect.id}`);
    }
  };

  return (
    <div
      ref={!isDragOverlay ? setNodeRef : undefined}
      style={style}
      {...(!isDragOverlay ? { ...listeners, ...attributes } : {})}
      onClick={handleClick}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        isDragging ? "opacity-40" : ""
      } ${isDragOverlay ? "shadow-xl" : ""}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
            column?.color || "bg-gray-400"
          }`}
        >
          {getInitials(`${prospect.firstName} ${prospect.lastName}`)}
        </div>

        {/* Name & Territory - NO truncate */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-brand-navy text-sm leading-tight">
            {prospect.firstName} {prospect.lastName}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {prospect.preferredTerritory || "No territory"}
          </p>
        </div>

        {/* Score Badge */}
        <span
          className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${getScoreBadgeClasses(
            prospect.prospectScore
          )}`}
        >
          {prospect.prospectScore}
        </span>
      </div>

      {/* Bottom row: days + badges */}
      <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {isStale ? (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <ClockIcon className="w-3.5 h-3.5" />
              {daysInStage}d — Stale
            </span>
          ) : (
            <span className="text-xs text-gray-400">{daysInStage}d</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Merged stage badge */}
          {mergedLabel && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
              {mergedLabel}
            </span>
          )}

          {/* Pre-work badge */}
          {isPreWorkStage && prospect.preWorkStatus && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${getPreWorkBadgeClasses(
                prospect.preWorkStatus
              )}`}
            >
              {prospect.preWorkStatus.replace(/_/g, " ")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
