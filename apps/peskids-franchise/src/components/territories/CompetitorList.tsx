"use client";

import { StarIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";

interface Competitor {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  isPrimaryThreat: boolean;
  distance?: number;
  address?: string;
}

interface CompetitorListProps {
  territoryId: string;
  competitors: Competitor[];
  onToggleThreat?: (id: string) => void;
}

export default function CompetitorList({
  competitors,
  onToggleThreat,
}: CompetitorListProps) {
  const sorted = [...competitors].sort((a, b) => {
    if (a.isPrimaryThreat !== b.isPrimaryThreat) {
      return a.isPrimaryThreat ? -1 : 1;
    }
    return (a.distance || 999) - (b.distance || 999);
  });

  // Density rings
  const within1mi = competitors.filter((c) => (c.distance || 0) <= 1).length;
  const within3mi = competitors.filter((c) => (c.distance || 0) <= 3).length;
  const within5mi = competitors.filter((c) => (c.distance || 0) <= 5).length;
  const within10mi = competitors.filter((c) => (c.distance || 0) <= 10).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Competitors
        </h4>
        <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
          {competitors.length}
        </span>
      </div>

      {competitors.length > 0 && (
        <div className="grid grid-cols-4 gap-1 text-center">
          {[
            { label: "1 mi", count: within1mi },
            { label: "3 mi", count: within3mi },
            { label: "5 mi", count: within5mi },
            { label: "10 mi", count: within10mi },
          ].map((ring) => (
            <div key={ring.label} className="bg-gray-50 rounded p-1.5">
              <p className="text-xs font-bold text-gray-900">{ring.count}</p>
              <p className="text-[10px] text-gray-500">{ring.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {sorted.map((comp) => (
          <div
            key={comp.id}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
              comp.isPrimaryThreat
                ? "bg-red-50 border border-red-100"
                : "hover:bg-gray-50"
            }`}
          >
            <button
              type="button"
              onClick={() => onToggleThreat?.(comp.id)}
              className="flex-shrink-0"
            >
              {comp.isPrimaryThreat ? (
                <StarSolidIcon className="h-3.5 w-3.5 text-red-500" />
              ) : (
                <StarIcon className="h-3.5 w-3.5 text-gray-300 hover:text-red-400" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{comp.name}</p>
              {comp.address && (
                <p className="text-gray-500 truncate">{comp.address}</p>
              )}
            </div>
            {comp.distance !== undefined && (
              <span className="flex-shrink-0 text-gray-500">
                {comp.distance.toFixed(1)} mi
              </span>
            )}
          </div>
        ))}
      </div>

      {competitors.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">
          No competitors found in this territory
        </p>
      )}
    </div>
  );
}
