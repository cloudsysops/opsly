"use client";

import { useState } from "react";
import { PencilSquareIcon, XMarkIcon } from "@heroicons/react/24/outline";

type DrawMode = "radius" | "polygon" | "rectangle";

interface DrawingToolbarProps {
  activeMode: DrawMode | null;
  onModeChange: (mode: DrawMode | null) => void;
  onCancel: () => void;
  isDrawing: boolean;
}

const INSTRUCTIONS: Record<DrawMode, string> = {
  radius: "Click to set center, click again to set radius",
  polygon: "Click to add points, double-click to close",
  rectangle: "Click and drag to draw rectangle",
};

function CircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function RectangleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <rect x="4" y="5" width="16" height="14" rx="1" />
    </svg>
  );
}

const tools: { mode: DrawMode; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { mode: "radius", label: "Circle / Radius", Icon: CircleIcon },
  { mode: "polygon", label: "Polygon", Icon: PencilSquareIcon },
  { mode: "rectangle", label: "Rectangle", Icon: RectangleIcon },
];

export default function DrawingToolbar({
  activeMode,
  onModeChange,
  onCancel,
  isDrawing,
}: DrawingToolbarProps) {
  const [hoveredTool, setHoveredTool] = useState<DrawMode | null>(null);
  const showCancel = isDrawing || activeMode !== null;

  function handleToolClick(mode: DrawMode) {
    if (activeMode === mode) {
      onModeChange(null);
    } else {
      onModeChange(mode);
    }
  }

  return (
    <div className="absolute left-3 top-20 z-10 flex flex-col items-start gap-2">
      <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-lg">
        <div className="flex flex-col gap-1 p-1.5">
          {tools.map(({ mode, label, Icon }) => {
            const isActive = activeMode === mode;
            return (
              <button
                key={mode}
                type="button"
                title={label}
                onClick={() => handleToolClick(mode)}
                onMouseEnter={() => setHoveredTool(mode)}
                onMouseLeave={() => setHoveredTool(null)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                  isActive
                    ? "bg-brand-navy text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </div>

        {showCancel && (
          <>
            <div className="mx-2 border-t border-gray-200" />
            <div className="p-1.5">
              <button
                type="button"
                title="Cancel"
                onClick={onCancel}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
      </div>

      {activeMode && (
        <div className="max-w-[200px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 shadow-md">
          {INSTRUCTIONS[activeMode]}
        </div>
      )}

      {hoveredTool && !activeMode && (
        <div className="sr-only">{hoveredTool}</div>
      )}
    </div>
  );
}
