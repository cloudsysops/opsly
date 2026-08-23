"use client";

import { useState } from "react";
import {
  EyeIcon,
  EyeSlashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";

interface LayerManagerProps {
  layers: {
    id: string;
    name: string;
    visible: boolean;
    opacity: number;
  }[];
  onToggleLayer: (layerId: string) => void;
  onOpacityChange: (layerId: string, opacity: number) => void;
}

export function LayerManager({
  layers,
  onToggleLayer,
  onOpacityChange,
}: LayerManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute bottom-3 left-3 z-10 bg-white rounded-xl shadow-lg border border-gray-200 max-w-[200px]">
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-700"
      >
        <span>Layers</span>
        {isExpanded ? (
          <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />
        ) : (
          <ChevronUpIcon className="h-3.5 w-3.5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2">
          {layers.map((layer) => (
            <div key={layer.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleLayer(layer.id)}
                  className="flex-shrink-0"
                  aria-label={
                    layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`
                  }
                >
                  <div
                    className={`relative w-7 h-4 rounded-full transition-colors ${
                      layer.visible ? "bg-brand-navy" : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${
                        layer.visible ? "translate-x-3.5" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </button>
                <span className="text-[11px] text-gray-600 truncate flex-1">
                  {layer.name}
                </span>
                {layer.visible ? (
                  <EyeIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                ) : (
                  <EyeSlashIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                )}
              </div>
              {layer.visible && (
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={layer.opacity * 100}
                  onChange={(e) =>
                    onOpacityChange(layer.id, Number(e.target.value) / 100)
                  }
                  className="w-full h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-brand-navy"
                  aria-label={`${layer.name} opacity`}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
