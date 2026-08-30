"use client";

import { useState } from "react";
import {
  TruckIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface IsochroneConfig {
  mode: "driving" | "walking" | "cycling";
  minutes: number;
  concentricRings: boolean;
}

interface IsochroneControlsProps {
  onGenerate: (polygon: GeoJSON.Feature, config: IsochroneConfig) => void;
  center: [number, number] | null;
  isLoading?: boolean;
}

const MODES = [
  { id: "driving" as const, label: "Drive", icon: TruckIcon },
  { id: "walking" as const, label: "Walk", icon: ClockIcon },
  { id: "cycling" as const, label: "Bike", icon: ClockIcon },
];

export default function IsochroneControls({
  onGenerate,
  center,
  isLoading,
}: IsochroneControlsProps) {
  const [mode, setMode] = useState<"driving" | "walking" | "cycling">(
    "driving"
  );
  const [minutes, setMinutes] = useState(15);
  const [concentricRings, setConcentricRings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!center) {
      setError("Click on the map to set a center point first.");
      return;
    }
    setError(null);

    try {
      const intervals = concentricRings
        ? [10, 20, 30]
        : [minutes];

      const res = await fetch("/api/admin/territories/isochrone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ center, minutes, mode, intervals: concentricRings ? intervals : undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate isochrone");
      }

      const data = await res.json();
      const polygon = data.polygon || data.polygons?.[0];
      if (polygon) {
        onGenerate(polygon, { mode, minutes, concentricRings });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Click the map to set a center point, then configure travel parameters.
      </p>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Travel Mode
        </label>
        <div className="flex gap-2">
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  mode === m.id
                    ? "bg-brand-navy text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Travel Time: {minutes} min
        </label>
        <input
          type="range"
          min={5}
          max={120}
          step={5}
          value={minutes}
          onChange={(e) => setMinutes(parseInt(e.target.value))}
          className="w-full accent-brand-navy"
        />
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>5 min</span>
          <span>60 min</span>
          <span>120 min</span>
        </div>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={concentricRings}
          onChange={(e) => setConcentricRings(e.target.checked)}
          className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
        />
        <span className="text-xs text-gray-700">
          Show concentric rings (10, 20, 30 min)
        </span>
      </label>

      {center && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-2">
          <p className="text-xs text-green-700">
            Center: {center[1].toFixed(4)}, {center[0].toFixed(4)}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={!center || isLoading}
        className="w-full rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Generating...
          </span>
        ) : (
          "Generate Isochrone"
        )}
      </button>
    </div>
  );
}
